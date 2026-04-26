import { Router } from "express";
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import { Employee, Organization } from "../schemas/db.js";
import {
    bankDetailSchema,
    employeeLoginSchema,
    employeeSchema,
    passwordChangeSchema
} from "../schemas/zod.js";
import {
    formatZodError,
    getEnvWithFallback,
    getFinancialYearYY,
    getMonthKey,
    getOrganizationCode,
    hasPaidForMonth
} from './utils.js';
import {
    clearPasswordResetState,
    createResetToken,
    isWithinResetWindow,
    sendPasswordResetOtp,
    verifyOtp,
    verifyResetToken
} from './password-reset.js';
import {
    forgotPasswordRequestSchema,
    forgotPasswordResetSchema,
    forgotPasswordVerifySchema
} from '../schemas/zod.js';


dotenv.config();


export const employeeRouter = Router();

async function generateUniqueEmployeeId(organization) {
    const yy = getFinancialYearYY();
    const orgCode = getOrganizationCode(organization.name);
    const prefix = `${yy}${orgCode}`;

    const count = await Employee.countDocuments({
        organization: organization._id,
        uniqueEmployeeId: { $regex: `^${prefix}` }
    });

    const serialNumber = count + 1;
    if (serialNumber > 9999) {
        throw new Error('Employee capacity exceeded for current organization financial year');
    }

    return `${prefix}${String(serialNumber).padStart(4, '0')}`;
}

async function authMiddleware(req, res, next){
    try{
        const token = req.headers.authorization?.split(' ')[1];
        if(!token){
            return res.status(401).json({error: "Unauthorized"});
        }
        const decoded = jwt.verify(
            token,
            getEnvWithFallback('EMPLOYEE_JWT', ['EMP_JWT', 'JWT_SECRET'])
        );
        const employee = await Employee.findById(decoded.id);
        if(!employee){
            return res.status(401).json({error: "Unauthorized"});
        }
        req.employeeId = decoded.id;
        next();
    }
    catch(err){
        next(err);
    }
}

employeeRouter.post('/signup', async (req, res, next) => {
    try {
        const parsed = employeeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const data = parsed.data;
        if (!mongoose.Types.ObjectId.isValid(data.organizationId)) {
            return res.status(400).json({ error: 'Invalid organization ID' });
        }

        const organization = await Organization.findById(data.organizationId);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const existing = await Employee.findOne({ email: data.email });
        if (existing) {
            return res.status(409).json({ error: 'Employee email already registered' });
        }

        const uniqueEmployeeId = await generateUniqueEmployeeId(organization);
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const employee = await Employee.create({
            uniqueEmployeeId,
            name: data.name,
            email: data.email,
            password: hashedPassword,
            department: data.department,
            salary: data.salary,
            organization: data.organizationId,
            approval: {
                organizationApproved: false,
                adminApproved: false,
                status: 'pending'
            }
        });

        return res.status(201).json({
            message: 'Employee registered and waiting for approval',
            employee: {
                id: employee._id,
                uniqueEmployeeId: employee.uniqueEmployeeId,
                approvalStatus: employee.approval.status
            }
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Duplicate employee data found' });
        }
        next(err);
    }
});

employeeRouter.post('/login', async (req, res, next)=>{
    try{
        const parsed = employeeLoginSchema.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const { uniqueEmployeeId, password } = parsed.data;
        const employee = await Employee.findOne({ uniqueEmployeeId });
        if(!employee){
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, employee.password);
        if(!isPasswordValid){
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: employee._id },
            getEnvWithFallback('EMPLOYEE_JWT', ['EMP_JWT', 'JWT_SECRET']),
            { expiresIn: '8h' }
        );

        return res.status(200).json({
            message: 'Login successful',
            token,
            employee: {
                id: employee._id,
                uniqueEmployeeId: employee.uniqueEmployeeId,
                approval: employee.approval
            }
        });
    }
    catch(err){
        next(err);
    }
});

employeeRouter.post('/forgot-password/request-otp', async (req, res, next) => {
    try {
        const parsed = forgotPasswordRequestSchema.safeParse(req.body);
        if (!parsed.success || !parsed.data.uniqueEmployeeId) {
            return res.status(400).json({ error: 'uniqueEmployeeId is required for employee password reset' });
        }

        const employee = await Employee.findOne({ uniqueEmployeeId: parsed.data.uniqueEmployeeId });
        if (!employee) {
            return res.status(404).json({ error: 'Employee account not found for this employee ID' });
        }

        const { otpHash, expiresAt } = await sendPasswordResetOtp({
            recipientEmail: employee.email,
            recipientName: employee.name,
            roleLabel: 'employee'
        });

        employee.passwordReset = {
            otpHash,
            expiresAt,
            verifiedAt: null
        };
        await employee.save();

        return res.status(200).json({ message: 'OTP sent to your email address' });
    } catch (err) {
        next(err);
    }
});

employeeRouter.post('/forgot-password/verify-otp', async (req, res, next) => {
    try {
        const parsed = forgotPasswordVerifySchema.safeParse(req.body);
        if (!parsed.success || !parsed.data.uniqueEmployeeId) {
            return res.status(400).json({ error: 'uniqueEmployeeId and otp are required' });
        }

        const employee = await Employee.findOne({ uniqueEmployeeId: parsed.data.uniqueEmployeeId });
        if (!employee) {
            return res.status(404).json({ error: 'Employee account not found for this employee ID' });
        }

        const isValidOtp = await verifyOtp(employee, parsed.data.otp);
        if (!isValidOtp) {
            return res.status(401).json({ error: 'Invalid or expired OTP' });
        }

        employee.passwordReset.verifiedAt = new Date();
        await employee.save();

        return res.status(200).json({
            message: 'OTP verified',
            resetToken: createResetToken({ userId: employee._id, role: 'employee' })
        });
    } catch (err) {
        next(err);
    }
});

employeeRouter.post('/forgot-password/reset', async (req, res, next) => {
    try {
        const parsed = forgotPasswordResetSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const decoded = verifyResetToken(parsed.data.resetToken, 'employee');
        const employee = await Employee.findById(decoded.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee account not found' });
        }

        if (!isWithinResetWindow(employee)) {
            return res.status(401).json({ error: 'OTP verification expired. Please request a new OTP.' });
        }

        const isSamePassword = await bcrypt.compare(parsed.data.newPassword, employee.password);
        if (isSamePassword) {
            return res.status(400).json({ error: 'New password must be different from old password' });
        }

        employee.password = await bcrypt.hash(parsed.data.newPassword, 10);
        clearPasswordResetState(employee);
        await employee.save();

        return res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        next(err);
    }
});

employeeRouter.use(authMiddleware);

employeeRouter.get('/me', async (req, res, next) => {
    try {
        const employee = await Employee.findById(req.employeeId).populate('organization', 'name code');
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const monthKey = getMonthKey();
        const paidThisMonth = hasPaidForMonth(employee.paymentHistory, monthKey);

        return res.status(200).json({
            employee: {
                id: employee._id,
                uniqueEmployeeId: employee.uniqueEmployeeId,
                name: employee.name,
                email: employee.email,
                department: employee.department,
                salary: employee.salary,
                organization: employee.organization,
                approval: employee.approval,
                bankAccounts: employee.bankAccounts || [],
                paidStatus: paidThisMonth ? 'paid' : 'unpaid',
                monthKey
            }
        });
    } catch (err) {
        next(err);
    }
});

employeeRouter.post('/banks', async (req, res, next) => {
    try {
        const parsed = bankDetailSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const employee = await Employee.findById(req.employeeId);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        employee.bankAccounts.push(parsed.data);
        await employee.save();

        return res.status(201).json({ message: 'Bank account added', bankAccounts: employee.bankAccounts });
    } catch (err) {
        next(err);
    }
});

employeeRouter.patch('/change-password', async (req, res, next) => {
    try{
        const parsed = passwordChangeSchema.safeParse(req.body);
        if(!parsed.success){
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const { oldPassword, newPassword } = parsed.data;

        const employee = await Employee.findById(req.employeeId);
        if(!employee){
            return res.status(404).json({ error: 'Employee not found' });
        }

        const isOldPasswordValid = await bcrypt.compare(oldPassword, employee.password);
        if(!isOldPasswordValid){
            return res.status(401).json({ error: 'Old password is incorrect' });
        }

        const isSamePassword = await bcrypt.compare(newPassword, employee.password);
        if(isSamePassword){
            return res.status(400).json({ error: 'New password must be different from old password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        employee.password = hashedPassword;
        await employee.save();

        return res.status(200).json({ message: 'Password changed successfully' });
    }
    catch(err){
        next(err);
    }
});


