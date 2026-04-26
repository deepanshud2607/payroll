import { Router } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Admin, Employee, Organization } from '../schemas/db.js';
import {
    adminCreateSchema,
    approvalSchema,
    bankDetailSchema,
    forgotPasswordRequestSchema,
    forgotPasswordResetSchema,
    forgotPasswordVerifySchema,
    organizationLoginSchema,
    organizationSignupSchema,
    passwordChangeSchema,
    payAdminSchema,
    payAllSchema,
    paySingleSchema
} from '../schemas/zod.js';
import {
    applySalaryAdjustment,
    formatZodError,
    getEnvWithFallback,
    getFinancialYearYY,
    getMonthKey,
    getOrganizationCode,
    isEmployeeApproved
} from './utils.js';
import {
    clearPasswordResetState,
    createResetToken,
    isWithinResetWindow,
    sendPasswordResetOtp,
    verifyOtp,
    verifyResetToken
} from './password-reset.js';

dotenv.config();

export const organizationRouter = Router();

function sanitizeEmployee(employee) {
    return {
        id: employee._id,
        uniqueEmployeeId: employee.uniqueEmployeeId,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        salary: employee.salary,
        approval: employee.approval,
        createdAt: employee.createdAt
    };
}

function maskAccountNumber(accountNumber = '') {
    const digits = String(accountNumber);
    if (digits.length <= 4) {
        return digits;
    }
    return `XXXXXX${digits.slice(-4)}`;
}

function mapAccountPreview(account, ownerRole = 'organization') {
    return {
        id: String(account._id),
        bankName: account.bankName,
        accountLabel: `${account.bankName} • ${maskAccountNumber(account.accountNumber)}`,
        maskedAccountNumber: maskAccountNumber(account.accountNumber),
        ifscCode: account.ifscCode,
        ownerRole
    };
}

function hasPaidForMonth(paymentHistory = [], monthKey) {
    return paymentHistory.some((item) => item.monthKey === monthKey && item.status === 'paid');
}

async function organizationAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(
            token,
            getEnvWithFallback('ORG_JWT', ['ORGANIZATION_JWT', 'JWT_SECRET', 'EMPLOYEE_JWT'])
        );
        const organization = await Organization.findById(decoded.id);
        if (!organization) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.organizationId = organization._id;
        next();
    } catch (err) {
        next(err);
    }
}

organizationRouter.post('/signup', async (req, res, next) => {
    try {
        const parsed = organizationSignupSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const data = parsed.data;
        const existingOrg = await Organization.findOne({
            $or: [{ email: data.email }, { name: data.name }]
        });
        if (existingOrg) {
            return res.status(409).json({ error: 'Organization already exists' });
        }

        const orgPasswordHash = await bcrypt.hash(data.password, 10);
        const organization = await Organization.create({
            name: data.name,
            code: getOrganizationCode(data.name),
            email: data.email,
            password: orgPasswordHash,
            adminIds: [],
            bankAccounts: data.bankAccounts ?? [],
            branding: {
                logoUrl: data.branding?.logoUrl ?? '',
                coverPhotoUrl: data.branding?.coverPhotoUrl ?? '',
                websiteTheme: data.branding?.websiteTheme ?? ''
            }
        });

        return res.status(201).json({
            message: 'Organization registered successfully',
            organization: {
                id: organization._id,
                name: organization.name,
                email: organization.email,
                code: organization.code,
                financialYearPrefix: getFinancialYearYY()
            }
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Duplicate key conflict while creating organization' });
        }
        next(err);
    }
});

organizationRouter.post('/forgot-password/request-otp', async (req, res, next) => {
    try {
        const parsed = forgotPasswordRequestSchema.safeParse(req.body);
        if (!parsed.success || !parsed.data.email) {
            return res.status(400).json({ error: 'email is required for organization password reset' });
        }

        const organization = await Organization.findOne({ email: parsed.data.email });
        if (!organization) {
            return res.status(404).json({ error: 'Organization account not found for this email' });
        }

        const { otpHash, expiresAt } = await sendPasswordResetOtp({
            recipientEmail: organization.email,
            recipientName: organization.name,
            roleLabel: 'organization'
        });

        organization.passwordReset = {
            otpHash,
            expiresAt,
            verifiedAt: null
        };
        await organization.save();

        return res.status(200).json({ message: 'OTP sent to your email address' });
    } catch (err) {
        next(err);
    }
});

organizationRouter.post('/forgot-password/verify-otp', async (req, res, next) => {
    try {
        const parsed = forgotPasswordVerifySchema.safeParse(req.body);
        if (!parsed.success || !parsed.data.email) {
            return res.status(400).json({ error: 'email and otp are required' });
        }

        const organization = await Organization.findOne({ email: parsed.data.email });
        if (!organization) {
            return res.status(404).json({ error: 'Organization account not found for this email' });
        }

        const isValidOtp = await verifyOtp(organization, parsed.data.otp);
        if (!isValidOtp) {
            return res.status(401).json({ error: 'Invalid or expired OTP' });
        }

        organization.passwordReset.verifiedAt = new Date();
        await organization.save();

        return res.status(200).json({
            message: 'OTP verified',
            resetToken: createResetToken({ userId: organization._id, role: 'organization' })
        });
    } catch (err) {
        next(err);
    }
});

organizationRouter.post('/forgot-password/reset', async (req, res, next) => {
    try {
        const parsed = forgotPasswordResetSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const decoded = verifyResetToken(parsed.data.resetToken, 'organization');
        const organization = await Organization.findById(decoded.id);
        if (!organization) {
            return res.status(404).json({ error: 'Organization account not found' });
        }

        if (!isWithinResetWindow(organization)) {
            return res.status(401).json({ error: 'OTP verification expired. Please request a new OTP.' });
        }

        const isSamePassword = await bcrypt.compare(parsed.data.newPassword, organization.password);
        if (isSamePassword) {
            return res.status(400).json({ error: 'New password must be different from old password' });
        }

        organization.password = await bcrypt.hash(parsed.data.newPassword, 10);
        clearPasswordResetState(organization);
        await organization.save();

        return res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        next(err);
    }
});

organizationRouter.post('/login', async (req, res, next) => {
    try {
        const parsed = organizationLoginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const { email, password } = parsed.data;
        const organization = await Organization.findOne({ email });
        if (!organization) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, organization.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: organization._id },
            getEnvWithFallback('ORG_JWT', ['ORGANIZATION_JWT', 'JWT_SECRET', 'EMPLOYEE_JWT']),
            { expiresIn: '8h' }
        );
        return res.status(200).json({
            message: 'Login successful',
            token,
            organization: {
                id: organization._id,
                name: organization.name,
                email: organization.email,
                code: organization.code,
                branding: organization.branding
            }
        });
    } catch (err) {
        next(err);
    }
});

organizationRouter.use(organizationAuth);

organizationRouter.patch('/change-password', async (req, res, next) => {
    try {
        const parsed = passwordChangeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const { oldPassword, newPassword } = parsed.data;
        const organization = await Organization.findById(req.organizationId);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const isOldPasswordValid = await bcrypt.compare(oldPassword, organization.password);
        if (!isOldPasswordValid) {
            return res.status(401).json({ error: 'Old password is incorrect' });
        }

        const isSamePassword = await bcrypt.compare(newPassword, organization.password);
        if (isSamePassword) {
            return res.status(400).json({ error: 'New password must be different from old password' });
        }

        organization.password = await bcrypt.hash(newPassword, 10);
        await organization.save();
        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
});

organizationRouter.post('/admins', async (req, res, next) => {
    try {
        const parsed = adminCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const existingAdmin = await Admin.findOne({
            $or: [{ uniqueId: parsed.data.uniqueId }, { email: parsed.data.email }]
        });
        if (existingAdmin) {
            return res.status(409).json({ error: 'Admin unique ID or email already exists' });
        }

        const admin = await Admin.create({
            fullName: parsed.data.fullName,
            uniqueId: parsed.data.uniqueId,
            email: parsed.data.email,
            password: await bcrypt.hash(parsed.data.password, 10),
            organization: req.organizationId,
            salary: parsed.data.salary ?? 0,
            bankAccounts: parsed.data.bankAccounts ?? []
        });

        await Organization.findByIdAndUpdate(req.organizationId, {
            $addToSet: { adminIds: admin._id }
        });

        return res.status(201).json({
            message: 'Admin created successfully',
            admin: {
                id: admin._id,
                fullName: admin.fullName,
                uniqueId: admin.uniqueId,
                email: admin.email
            }
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Duplicate key conflict while creating admin' });
        }
        next(err);
    }
});

organizationRouter.get('/admins', async (req, res, next) => {
    try {
        const admins = await Admin.find({ organization: req.organizationId })
            .select('-password -passwordReset')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            admins: admins.map((admin) => ({
                id: admin._id,
                fullName: admin.fullName,
                uniqueId: admin.uniqueId,
                email: admin.email,
                salary: admin.salary,
                createdAt: admin.createdAt
            }))
        });
    } catch (err) {
        next(err);
    }
});

organizationRouter.get('/me', async (req, res, next) => {
    try {
        const organization = await Organization.findById(req.organizationId).select('-password');
        return res.status(200).json({ organization });
    } catch (err) {
        next(err);
    }
});

organizationRouter.patch('/branding', async (req, res, next) => {
    try {
        const updates = {
            logoUrl: req.body.logoUrl,
            coverPhotoUrl: req.body.coverPhotoUrl,
            websiteTheme: req.body.websiteTheme
        };

        const organization = await Organization.findById(req.organizationId);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        organization.branding.logoUrl = updates.logoUrl ?? organization.branding.logoUrl;
        organization.branding.coverPhotoUrl = updates.coverPhotoUrl ?? organization.branding.coverPhotoUrl;
        organization.branding.websiteTheme = updates.websiteTheme ?? organization.branding.websiteTheme;

        await organization.save();
        return res.status(200).json({ message: 'Branding updated', branding: organization.branding });
    } catch (err) {
        next(err);
    }
});

organizationRouter.post('/banks', async (req, res, next) => {
    try {
        const parsed = bankDetailSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const organization = await Organization.findById(req.organizationId);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        organization.bankAccounts.push(parsed.data);
        await organization.save();

        return res.status(201).json({ message: 'Bank account added', bankAccounts: organization.bankAccounts });
    } catch (err) {
        next(err);
    }
});

organizationRouter.get('/employees', async (req, res, next) => {
    try {
        const employees = await Employee.find({
            organization: req.organizationId,
            'approval.status': 'approved'
        }).sort({ createdAt: -1 });
        return res.status(200).json({ employees: employees.map(sanitizeEmployee) });
    } catch (err) {
        next(err);
    }
});

organizationRouter.get('/employees/pending', async (req, res, next) => {
    try {
        const pending = await Employee.find({
            organization: req.organizationId,
            'approval.status': 'pending'
        }).sort({ createdAt: -1 });

        return res.status(200).json({ pendingRequests: pending.map(sanitizeEmployee) });
    } catch (err) {
        next(err);
    }
});

organizationRouter.patch('/employees/:employeeId/approve', async (req, res, next) => {
    try {
        const parsedBody = approvalSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({ error: formatZodError(parsedBody.error) });
        }

        const { employeeId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        const employee = await Employee.findOne({ _id: employeeId, organization: req.organizationId });
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const adminCount = await Admin.countDocuments({ organization: req.organizationId });
        const hasAdmins = adminCount > 0;

        employee.approval.organizationApproved = parsedBody.data.approve;
        if (!parsedBody.data.approve) {
            employee.approval.status = 'rejected';
        } else if (!hasAdmins || employee.approval.adminApproved) {
            employee.approval.status = 'approved';
        } else {
            employee.approval.status = 'pending';
        }

        await employee.save();

        return res.status(200).json({
            message: 'Organization approval updated',
            approval: employee.approval
        });
    } catch (err) {
        next(err);
    }
});

organizationRouter.get('/payments/unpaid', async (req, res, next) => {
    try {
        const monthKey = getMonthKey();
        const [organization, employees, admins] = await Promise.all([
            Organization.findById(req.organizationId),
            Employee.find({ organization: req.organizationId }),
            Admin.find({ organization: req.organizationId })
        ]);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const hasAdmins = admins.length > 0;
        const sourceAccounts = (organization.bankAccounts || []).map((account) =>
            mapAccountPreview(account, 'organization')
        );

        const unpaidEmployees = employees
            .filter((employee) => isEmployeeApproved(employee, hasAdmins))
            .filter((employee) => !hasPaidForMonth(employee.paymentHistory, monthKey))
            .map(sanitizeEmployee);
        const unpaidAdmins = admins
            .filter((admin) => !hasPaidForMonth(admin.paymentHistory, monthKey))
            .map((admin) => ({
                id: admin._id,
                uniqueId: admin.uniqueId,
                fullName: admin.fullName,
                salary: admin.salary
            }));

        return res.status(200).json({
            monthKey,
            unpaidEmployees,
            unpaidAdmins,
            sourceAccounts,
            sourceAccountRequiredNotice:
                sourceAccounts.length === 0 ? 'Please add a bank account first.' : null
        });
    } catch (err) {
        next(err);
    }
});

organizationRouter.get('/payments/paid', async (req, res, next) => {
    try {
        const monthKey = getMonthKey();
        const employees = await Employee.find({ organization: req.organizationId });
        const admins = await Admin.find({ organization: req.organizationId });

        const paidEmployees = employees
            .filter((employee) => hasPaidForMonth(employee.paymentHistory, monthKey))
            .map((employee) => {
                const payment = employee.paymentHistory.find(
                    (item) => item.monthKey === monthKey && item.status === 'paid'
                );
                return {
                    ...sanitizeEmployee(employee),
                    payment
                };
            });

        const paidAdmins = admins
            .map((admin) => {
                const payment = admin.paymentHistory.find(
                    (item) => item.monthKey === monthKey && item.status === 'paid'
                );
                if (!payment) {
                    return null;
                }
                return {
                    id: admin._id,
                    uniqueId: admin.uniqueId,
                    fullName: admin.fullName,
                    payment
                };
            })
            .filter(Boolean);

        return res.status(200).json({
            monthKey,
            paidEmployees,
            paidAdmins
        });
    } catch (err) {
        next(err);
    }
});

organizationRouter.post('/payments/pay-one', async (req, res, next) => {
    try {
        const parsed = paySingleSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const { employeeId, sourceAccountId, adjustmentType, adjustmentAmount } = parsed.data;
        const [organization, adminCount] = await Promise.all([
            Organization.findById(req.organizationId),
            Admin.countDocuments({ organization: req.organizationId })
        ]);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const sourceAccount = (organization.bankAccounts || []).find(
            (account) => String(account._id) === sourceAccountId
        );

        if (!sourceAccount) {
            return res.status(400).json({ error: 'Please select a valid organization bank account.' });
        }

        if ((organization.bankAccounts?.length ?? 0) === 0) {
            return res.status(403).json({ error: 'Please add a bank account first.' });
        }

        const employee = await Employee.findOne({ _id: employeeId, organization: req.organizationId });
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        if (!isEmployeeApproved(employee, adminCount > 0)) {
            return res.status(403).json({ error: 'Employee is not fully approved yet' });
        }

        const monthKey = getMonthKey();
        if (hasPaidForMonth(employee.paymentHistory, monthKey)) {
            return res.status(409).json({ error: 'Employee already paid for this month' });
        }

        const amount = applySalaryAdjustment(employee.salary, adjustmentType, adjustmentAmount);
        employee.paymentHistory.push({
            monthKey,
            amount,
            date: new Date(),
            status: 'paid',
            paidByRole: 'organization',
            paidById: req.organizationId,
            adjustment: { type: adjustmentType, amount: adjustmentAmount },
            sourceAccount: {
                accountId: sourceAccount._id,
                bankName: sourceAccount.bankName,
                maskedAccountNumber: maskAccountNumber(sourceAccount.accountNumber),
                ifscCode: sourceAccount.ifscCode,
                ownerRole: 'organization'
            }
        });
        await employee.save();

        return res.status(200).json({
            message: 'Salary paid',
            payment: employee.paymentHistory[employee.paymentHistory.length - 1]
        });
    } catch (err) {
        next(err);
    }
});

organizationRouter.post('/payments/pay-all', async (req, res, next) => {
    try {
        const parsed = payAllSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const { sourceAccountId, adjustmentType, adjustmentAmount, includeAdmin } = parsed.data;
        const monthKey = getMonthKey();

        const [organization, admins] = await Promise.all([
            Organization.findById(req.organizationId),
            Admin.find({ organization: req.organizationId })
        ]);

        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        if ((organization.bankAccounts?.length ?? 0) === 0) {
            return res.status(403).json({ error: 'Please add a bank account first.' });
        }

        const sourceAccount = (organization.bankAccounts || []).find(
            (account) => String(account._id) === sourceAccountId
        );
        if (!sourceAccount) {
            return res.status(400).json({ error: 'Please select a valid organization bank account.' });
        }

        const hasAdmins = admins.length > 0;
        const employees = await Employee.find({ organization: req.organizationId });
        let employeePaidCount = 0;

        for (const employee of employees) {
            if (!isEmployeeApproved(employee, hasAdmins)) {
                continue;
            }
            if (hasPaidForMonth(employee.paymentHistory, monthKey)) {
                continue;
            }

            const amount = applySalaryAdjustment(employee.salary, adjustmentType, adjustmentAmount);
            employee.paymentHistory.push({
                monthKey,
                amount,
                date: new Date(),
                status: 'paid',
                paidByRole: 'organization',
                paidById: req.organizationId,
                adjustment: { type: adjustmentType, amount: adjustmentAmount },
                sourceAccount: {
                    accountId: sourceAccount._id,
                    bankName: sourceAccount.bankName,
                    maskedAccountNumber: maskAccountNumber(sourceAccount.accountNumber),
                    ifscCode: sourceAccount.ifscCode,
                    ownerRole: 'organization'
                }
            });
            await employee.save();
            employeePaidCount += 1;
        }

        let adminPaidCount = 0;
        if (includeAdmin) {
            for (const admin of admins) {
                if (hasPaidForMonth(admin.paymentHistory, monthKey)) {
                    continue;
                }
                admin.paymentHistory.push({
                    monthKey,
                    amount: admin.salary,
                    date: new Date(),
                    status: 'paid',
                    paidByRole: 'organization',
                    paidById: req.organizationId,
                    adjustment: { type: 'none', amount: 0 },
                    sourceAccount: {
                        accountId: sourceAccount._id,
                        bankName: sourceAccount.bankName,
                        maskedAccountNumber: maskAccountNumber(sourceAccount.accountNumber),
                        ifscCode: sourceAccount.ifscCode,
                        ownerRole: 'organization'
                    }
                });
                await admin.save();
                adminPaidCount += 1;
            }
        }

        return res.status(200).json({
            message: 'Bulk salary run completed',
            monthKey,
            employeePaidCount,
            adminPaidCount
        });
    } catch (err) {
        next(err);
    }
});

organizationRouter.post('/payments/pay-admin', async (req, res, next) => {
    try {
        const parsed = payAdminSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: formatZodError(parsed.error) });
        }

        const { adminId, sourceAccountId } = parsed.data;
        const organization = await Organization.findById(req.organizationId);
        if (!organization) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        if ((organization.bankAccounts?.length ?? 0) === 0) {
            return res.status(403).json({ error: 'Please add a bank account first.' });
        }

        const sourceAccount = (organization.bankAccounts || []).find(
            (account) => String(account._id) === sourceAccountId
        );
        if (!sourceAccount) {
            return res.status(400).json({ error: 'Please select a valid organization bank account.' });
        }

        const admin = await Admin.findOne({ _id: adminId, organization: req.organizationId });
        if (!admin) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        const monthKey = getMonthKey();
        if (hasPaidForMonth(admin.paymentHistory, monthKey)) {
            return res.status(409).json({ error: 'Admin already paid for this month' });
        }

        admin.paymentHistory.push({
            monthKey,
            amount: admin.salary,
            date: new Date(),
            status: 'paid',
            paidByRole: 'organization',
            paidById: req.organizationId,
            adjustment: { type: 'none', amount: 0 },
            sourceAccount: {
                accountId: sourceAccount._id,
                bankName: sourceAccount.bankName,
                maskedAccountNumber: maskAccountNumber(sourceAccount.accountNumber),
                ifscCode: sourceAccount.ifscCode,
                ownerRole: 'organization'
            }
        });
        await admin.save();

        return res.status(200).json({
            message: 'Admin salary paid',
            payment: admin.paymentHistory[admin.paymentHistory.length - 1]
        });
    } catch (err) {
        next(err);
    }
});
