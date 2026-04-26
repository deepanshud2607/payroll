import { Router } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Admin, Employee, Organization } from '../schemas/db.js';
import {
	adminLoginSchema,
	approvalSchema,
	bankDetailSchema,
	forgotPasswordRequestSchema,
	forgotPasswordResetSchema,
	forgotPasswordVerifySchema,
	passwordChangeSchema,
	payAllSchema,
	paySingleSchema
} from '../schemas/zod.js';
import {
	applySalaryAdjustment,
	formatZodError,
	getEnvWithFallback,
	getMonthKey,
	hasPaidForMonth,
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

export const adminRouter = Router();

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

function mapAccountPreview(account, ownerRole) {
	return {
		id: String(account._id),
		bankName: account.bankName,
		accountLabel: `${account.bankName} • ${maskAccountNumber(account.accountNumber)}`,
		maskedAccountNumber: maskAccountNumber(account.accountNumber),
		ifscCode: account.ifscCode,
		ownerRole
	};
}

async function adminAuth(req, res, next) {
	try {
		const token = req.headers.authorization?.split(' ')[1];
		if (!token) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const decoded = jwt.verify(
			token,
			getEnvWithFallback('ADMIN_JWT', ['ADMIN_AUTH_JWT', 'JWT_SECRET', 'EMPLOYEE_JWT'])
		);
		const admin = await Admin.findById(decoded.id);
		if (!admin) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		req.adminId = admin._id;
		req.organizationId = admin.organization;
		next();
	} catch (err) {
		next(err);
	}
}

adminRouter.post('/login', async (req, res, next) => {
	try {
		const parsed = adminLoginSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ error: formatZodError(parsed.error) });
		}

		const { uniqueId, password } = parsed.data;
		const admin = await Admin.findOne({ uniqueId });
		if (!admin) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		const isPasswordValid = await bcrypt.compare(password, admin.password);
		if (!isPasswordValid) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		const token = jwt.sign(
			{ id: admin._id },
			getEnvWithFallback('ADMIN_JWT', ['ADMIN_AUTH_JWT', 'JWT_SECRET', 'EMPLOYEE_JWT']),
			{ expiresIn: '8h' }
		);
		return res.status(200).json({
			message: 'Login successful',
			token,
			admin: {
				id: admin._id,
				uniqueId: admin.uniqueId,
				fullName: admin.fullName,
				organizationId: admin.organization
			}
		});
	} catch (err) {
		next(err);
	}
});

adminRouter.post('/forgot-password/request-otp', async (req, res, next) => {
	try {
		const parsed = forgotPasswordRequestSchema.safeParse(req.body);
		if (!parsed.success || !parsed.data.uniqueId) {
			return res.status(400).json({ error: 'uniqueId is required for admin password reset' });
		}

		const admin = await Admin.findOne({ uniqueId: parsed.data.uniqueId });
		if (!admin) {
			return res.status(404).json({ error: 'Admin account not found for this unique ID' });
		}

		const { otpHash, expiresAt } = await sendPasswordResetOtp({
			recipientEmail: admin.email,
			recipientName: admin.fullName,
			roleLabel: 'admin'
		});

		admin.passwordReset = {
			otpHash,
			expiresAt,
			verifiedAt: null
		};
		await admin.save();

		return res.status(200).json({ message: 'OTP sent to your email address' });
	} catch (err) {
		next(err);
	}
});

adminRouter.post('/forgot-password/verify-otp', async (req, res, next) => {
	try {
		const parsed = forgotPasswordVerifySchema.safeParse(req.body);
		if (!parsed.success || !parsed.data.uniqueId) {
			return res.status(400).json({ error: 'uniqueId and otp are required' });
		}

		const admin = await Admin.findOne({ uniqueId: parsed.data.uniqueId });
		if (!admin) {
			return res.status(404).json({ error: 'Admin account not found for this unique ID' });
		}

		const isValidOtp = await verifyOtp(admin, parsed.data.otp);
		if (!isValidOtp) {
			return res.status(401).json({ error: 'Invalid or expired OTP' });
		}

		admin.passwordReset.verifiedAt = new Date();
		await admin.save();

		return res.status(200).json({
			message: 'OTP verified',
			resetToken: createResetToken({ userId: admin._id, role: 'admin' })
		});
	} catch (err) {
		next(err);
	}
});

adminRouter.post('/forgot-password/reset', async (req, res, next) => {
	try {
		const parsed = forgotPasswordResetSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ error: formatZodError(parsed.error) });
		}

		const decoded = verifyResetToken(parsed.data.resetToken, 'admin');
		const admin = await Admin.findById(decoded.id);
		if (!admin) {
			return res.status(404).json({ error: 'Admin account not found' });
		}

		if (!isWithinResetWindow(admin)) {
			return res.status(401).json({ error: 'OTP verification expired. Please request a new OTP.' });
		}

		const isSamePassword = await bcrypt.compare(parsed.data.newPassword, admin.password);
		if (isSamePassword) {
			return res.status(400).json({ error: 'New password must be different from old password' });
		}

		admin.password = await bcrypt.hash(parsed.data.newPassword, 10);
		clearPasswordResetState(admin);
		await admin.save();

		return res.status(200).json({ message: 'Password reset successful' });
	} catch (err) {
		next(err);
	}
});

adminRouter.use(adminAuth);

adminRouter.patch('/change-password', async (req, res, next) => {
	try {
		const parsed = passwordChangeSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ error: formatZodError(parsed.error) });
		}

		const { oldPassword, newPassword } = parsed.data;
		const admin = await Admin.findById(req.adminId);
		if (!admin) {
			return res.status(404).json({ error: 'Admin not found' });
		}

		const isOldPasswordValid = await bcrypt.compare(oldPassword, admin.password);
		if (!isOldPasswordValid) {
			return res.status(401).json({ error: 'Old password is incorrect' });
		}

		const isSamePassword = await bcrypt.compare(newPassword, admin.password);
		if (isSamePassword) {
			return res.status(400).json({ error: 'New password must be different from old password' });
		}

		admin.password = await bcrypt.hash(newPassword, 10);
		await admin.save();
		return res.status(200).json({ message: 'Password changed successfully' });
	} catch (err) {
		next(err);
	}
});

adminRouter.get('/me', async (req, res, next) => {
	try {
		const admin = await Admin.findById(req.adminId).select('-password');
		if (!admin) {
			return res.status(404).json({ error: 'Admin not found' });
		}

		const organization = await Organization.findById(req.organizationId).select('name code bankAccounts');
		const organizationBankAccounts = (organization?.bankAccounts || []).map((account) =>
			mapAccountPreview(account, 'organization')
		);

		return res.status(200).json({
			admin,
			organizationBankAccounts,
			organizationMeta: organization
				? { id: organization._id, name: organization.name, code: organization.code }
				: null
		});
	} catch (err) {
		next(err);
	}
});

adminRouter.post('/banks', async (req, res, next) => {
	try {
		const parsed = bankDetailSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ error: formatZodError(parsed.error) });
		}

		const admin = await Admin.findById(req.adminId);
		if (!admin) {
			return res.status(404).json({ error: 'Admin not found' });
		}

		admin.bankAccounts.push(parsed.data);
		await admin.save();

		return res.status(201).json({ message: 'Bank account added', bankAccounts: admin.bankAccounts });
	} catch (err) {
		next(err);
	}
});

adminRouter.get('/employees', async (req, res, next) => {
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

adminRouter.get('/employees/pending', async (req, res, next) => {
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

adminRouter.patch('/employees/:employeeId/approve', async (req, res, next) => {
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

		employee.approval.adminApproved = parsedBody.data.approve;
		if (!parsedBody.data.approve) {
			employee.approval.status = 'rejected';
		} else if (employee.approval.organizationApproved) {
			employee.approval.status = 'approved';
		} else {
			employee.approval.status = 'pending';
		}

		await employee.save();

		return res.status(200).json({
			message: 'Admin approval updated',
			approval: employee.approval
		});
	} catch (err) {
		next(err);
	}
});

adminRouter.get('/payments/unpaid', async (req, res, next) => {
	try {
		const monthKey = getMonthKey();
		const [organization, admin, employees] = await Promise.all([
			Organization.findById(req.organizationId),
			Admin.findById(req.adminId),
			Employee.find({ organization: req.organizationId })
		]);

		if (!organization || !admin) {
			return res.status(404).json({ error: 'Admin or organization not found' });
		}

		const sourceAccounts = [
			...(organization.bankAccounts || []).map((account) => mapAccountPreview(account, 'organization')),
			...(admin.bankAccounts || []).map((account) => mapAccountPreview(account, 'admin'))
		];

		const unpaidEmployees = employees
			.filter((employee) => isEmployeeApproved(employee))
			.filter((employee) => !hasPaidForMonth(employee.paymentHistory, monthKey))
			.map(sanitizeEmployee);

		return res.status(200).json({
			monthKey,
			unpaidEmployees,
			sourceAccounts,
			sourceAccountRequiredNotice:
				sourceAccounts.length === 0 ? 'Please add a bank account first.' : null
		});
	} catch (err) {
		next(err);
	}
});

adminRouter.get('/payments/paid', async (req, res, next) => {
	try {
		const monthKey = getMonthKey();
		const employees = await Employee.find({ organization: req.organizationId });

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

		return res.status(200).json({ monthKey, paidEmployees });
	} catch (err) {
		next(err);
	}
});

adminRouter.post('/payments/pay-one', async (req, res, next) => {
	try {
		const parsed = paySingleSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ error: formatZodError(parsed.error) });
		}

		const { employeeId, sourceAccountId, adjustmentType, adjustmentAmount } = parsed.data;
		if (employeeId === String(req.adminId)) {
			return res.status(403).json({ error: 'Admin cannot pay self' });
		}

		const [organization, admin] = await Promise.all([
			Organization.findById(req.organizationId),
			Admin.findById(req.adminId)
		]);

		if (!organization || !admin) {
			return res.status(404).json({ error: 'Admin or organization not found' });
		}

		const allSourceAccounts = [
			...(organization.bankAccounts || []).map((account) => ({ ...account.toObject(), ownerRole: 'organization' })),
			...(admin.bankAccounts || []).map((account) => ({ ...account.toObject(), ownerRole: 'admin' }))
		];

		if (allSourceAccounts.length === 0) {
			return res.status(403).json({
				error: 'Please add a bank account first.'
			});
		}

		const sourceAccount = allSourceAccounts.find((account) => String(account._id) === sourceAccountId);
		if (!sourceAccount) {
			return res.status(400).json({ error: 'Please select a valid source bank account.' });
		}

		const employee = await Employee.findOne({ _id: employeeId, organization: req.organizationId });
		if (!employee) {
			return res.status(404).json({ error: 'Employee not found' });
		}

		if (!isEmployeeApproved(employee)) {
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
			paidByRole: 'admin',
			paidById: req.adminId,
			adjustment: { type: adjustmentType, amount: adjustmentAmount },
			sourceAccount: {
				accountId: sourceAccount._id,
				bankName: sourceAccount.bankName,
				maskedAccountNumber: maskAccountNumber(sourceAccount.accountNumber),
				ifscCode: sourceAccount.ifscCode,
				ownerRole: sourceAccount.ownerRole
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

adminRouter.post('/payments/pay-all', async (req, res, next) => {
	try {
		const parsed = payAllSchema.safeParse(req.body ?? {});
		if (!parsed.success) {
			return res.status(400).json({ error: formatZodError(parsed.error) });
		}

		const { sourceAccountId, adjustmentType, adjustmentAmount } = parsed.data;
		const [organization, admin] = await Promise.all([
			Organization.findById(req.organizationId),
			Admin.findById(req.adminId)
		]);

		if (!organization || !admin) {
			return res.status(404).json({ error: 'Admin or organization not found' });
		}

		const allSourceAccounts = [
			...(organization.bankAccounts || []).map((account) => ({ ...account.toObject(), ownerRole: 'organization' })),
			...(admin.bankAccounts || []).map((account) => ({ ...account.toObject(), ownerRole: 'admin' }))
		];

		if (allSourceAccounts.length === 0) {
			return res.status(403).json({
				error: 'Please add a bank account first.'
			});
		}

		const sourceAccount = allSourceAccounts.find((account) => String(account._id) === sourceAccountId);
		if (!sourceAccount) {
			return res.status(400).json({ error: 'Please select a valid source bank account.' });
		}

		const monthKey = getMonthKey();
		const employees = await Employee.find({ organization: req.organizationId });

		let paidCount = 0;
		for (const employee of employees) {
			if (!isEmployeeApproved(employee)) {
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
				paidByRole: 'admin',
				paidById: req.adminId,
				adjustment: { type: adjustmentType, amount: adjustmentAmount },
				sourceAccount: {
					accountId: sourceAccount._id,
					bankName: sourceAccount.bankName,
					maskedAccountNumber: maskAccountNumber(sourceAccount.accountNumber),
					ifscCode: sourceAccount.ifscCode,
					ownerRole: sourceAccount.ownerRole
				}
			});
			await employee.save();
			paidCount += 1;
		}

		return res.status(200).json({
			message: 'Bulk salary run completed',
			monthKey,
			paidCount
		});
	} catch (err) {
		next(err);
	}
});