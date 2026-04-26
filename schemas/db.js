import mongoose from 'mongoose';

const bankDetailSchema = new mongoose.Schema(
    {
        bankName: { type: String, required: true, trim: true },
        accountHolderName: { type: String, required: true, trim: true },
        accountNumber: { type: String, required: true, trim: true },
        ifscCode: { type: String, required: true, trim: true, uppercase: true },
        branch: { type: String, trim: true }
    },
    { _id: true }
);

const paymentHistorySchema = new mongoose.Schema(
    {
        monthKey: { type: String, required: true },
        amount: { type: Number, required: true },
        date: { type: Date, required: true, default: Date.now },
        status: { type: String, required: true, enum: ['paid'] },
        paidByRole: { type: String, required: true, enum: ['organization', 'admin'] },
        paidById: { type: mongoose.Schema.Types.ObjectId, required: true },
        adjustment: {
            type: {
                type: String,
                enum: ['none', 'raise', 'deduct'],
                default: 'none'
            },
            amount: { type: Number, default: 0 }
        },
        sourceAccount: {
            accountId: { type: mongoose.Schema.Types.ObjectId },
            bankName: { type: String, trim: true },
            maskedAccountNumber: { type: String, trim: true },
            ifscCode: { type: String, trim: true },
            ownerRole: { type: String, enum: ['organization', 'admin'] }
        }
    },
    { _id: true }
);

const organizationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        code: { type: String, required: true, uppercase: true },
        email: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true },
        adminIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Admin'
            }
        ],
        bankAccounts: [bankDetailSchema],
        branding: {
            logoUrl: { type: String, default: '' },
            coverPhotoUrl: { type: String, default: '' },
            websiteTheme: { type: String, default: '' }
        },
        passwordReset: {
            otpHash: { type: String, default: null },
            expiresAt: { type: Date, default: null },
            verifiedAt: { type: Date, default: null }
        }
    },
    { timestamps: true }
);

const adminSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        uniqueId: { type: String, required: true, unique: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true },
        salary: { type: Number, default: 0, min: 0 },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true
        },
        bankAccounts: [bankDetailSchema],
        paymentHistory: [paymentHistorySchema],
        passwordReset: {
            otpHash: { type: String, default: null },
            expiresAt: { type: Date, default: null },
            verifiedAt: { type: Date, default: null }
        }
    },
    { timestamps: true }
);

const employeeSchema = new mongoose.Schema(
    {
        uniqueEmployeeId: { type: String, required: true, unique: true, trim: true },
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true },
        department: { type: String, required: true, trim: true },
        salary: { type: Number, required: true, min: 0 },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true
        },
        approval: {
            organizationApproved: { type: Boolean, default: false },
            adminApproved: { type: Boolean, default: false },
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending'
            }
        },
        bankAccounts: [bankDetailSchema],
        paymentHistory: [paymentHistorySchema],
        passwordReset: {
            otpHash: { type: String, default: null },
            expiresAt: { type: Date, default: null },
            verifiedAt: { type: Date, default: null }
        }
    },
    { timestamps: true }
);

export const Organization = mongoose.model('Organization', organizationSchema);
export const Admin = mongoose.model('Admin', adminSchema);
export const Employee = mongoose.model('Employee', employeeSchema);