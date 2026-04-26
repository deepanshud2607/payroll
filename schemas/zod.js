import zod from 'zod';

const strongPassword = zod
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)');

const adminUniqueIdRegex = /^(?=.{7,})(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d._-]+$/;

export const bankDetailSchema = zod.object({
    bankName: zod.string().min(2).max(80),
    accountHolderName: zod.string().min(2).max(80),
    accountNumber: zod.string().regex(/^\d{9,18}$/, 'Account number must be 9 to 18 digits'),
    ifscCode: zod.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/i, 'Invalid IFSC format'),
    branch: zod.string().max(100).optional()
});

export const employeeSchema = zod.object({
    name: zod.string().min(1),
    email: zod.string().email(),
    password: strongPassword,
    department: zod.string().min(1),
    salary: zod.number().nonnegative(),
    organizationId: zod.string().min(24).max(24)
});

export const employeeLoginSchema = zod.object({
    uniqueEmployeeId: zod.string().regex(/^\d{2}[A-Z]{2}\d{4}$/, 'Invalid employee ID format'),
    password: zod.string().min(8)
});

export const adminLoginSchema = zod.object({
    uniqueId: zod.string().min(7),
    password: zod.string().min(8)
});

export const organizationLoginSchema = zod.object({
    email: zod.string().email(),
    password: zod.string().min(8)
});

export const organizationSignupSchema = zod.object({
    name: zod.string().min(2),
    email: zod.string().email(),
    password: strongPassword,
    bankAccounts: zod.array(bankDetailSchema).optional(),
    branding: zod
        .object({
            logoUrl: zod.string().url().optional(),
            coverPhotoUrl: zod.string().url().optional(),
            websiteTheme: zod.string().max(120).optional()
        })
        .optional()
});

export const adminCreateSchema = zod.object({
    fullName: zod.string().min(2),
    email: zod.string().email(),
    password: strongPassword,
    uniqueId: zod
        .string()
        .regex(
            adminUniqueIdRegex,
            'Unique ID must be at least 7 chars and include letters and numbers'
        ),
    salary: zod.number().nonnegative().optional(),
    bankAccounts: zod.array(bankDetailSchema).optional()
});

export const approvalSchema = zod.object({
    approve: zod.boolean()
});

export const paySingleSchema = zod.object({
    employeeId: zod.string().min(24).max(24),
    sourceAccountId: zod.string().min(24).max(24),
    adjustmentType: zod.enum(['none', 'raise', 'deduct']).default('none'),
    adjustmentAmount: zod.number().nonnegative().default(0)
});

export const payAllSchema = zod.object({
    sourceAccountId: zod.string().min(24).max(24),
    adjustmentType: zod.enum(['none', 'raise', 'deduct']).default('none'),
    adjustmentAmount: zod.number().nonnegative().default(0),
    includeAdmin: zod.boolean().default(true)
});

export const payAdminSchema = zod.object({
    adminId: zod.string().min(24).max(24),
    sourceAccountId: zod.string().min(24).max(24)
});

export const passwordChangeSchema = zod.object({
    oldPassword: zod.string().min(8),
    newPassword: strongPassword
});

export const forgotPasswordRequestSchema = zod.object({
    email: zod.string().email().optional(),
    uniqueId: zod.string().min(1).optional(),
    uniqueEmployeeId: zod.string().min(1).optional()
});

export const forgotPasswordVerifySchema = forgotPasswordRequestSchema.extend({
    otp: zod.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number')
});

export const forgotPasswordResetSchema = zod.object({
    resetToken: zod.string().min(10),
    newPassword: strongPassword
});

export const adminSchema = zod.object({
    username: zod.string().min(1),
    password: strongPassword
});