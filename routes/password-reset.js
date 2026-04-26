import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { getEnvWithFallback } from './utils.js';

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_REUSE_WINDOW_MS = 15 * 60 * 1000;

function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function getMailerTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });
}

export async function sendPasswordResetOtp({ recipientEmail, recipientName, roleLabel }) {
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    const transport = getMailerTransport();
    if (transport) {
        const from = process.env.SMTP_FROM || process.env.SMTP_USER;
        await transport.sendMail({
            from,
            to: recipientEmail,
            subject: `Your ${roleLabel} password reset OTP`,
            text: `Hello ${recipientName || ''}, your OTP is ${otp}. It expires in 10 minutes.`,
            html: `<p>Hello ${recipientName || ''},</p><p>Your OTP is <b>${otp}</b>.</p><p>It expires in 10 minutes.</p>`
        });
    } else {
        console.log(`Password reset OTP for ${recipientEmail}: ${otp}`);
    }

    return { otpHash, expiresAt };
}

export function clearPasswordResetState(user) {
    user.passwordReset = {
        otpHash: null,
        expiresAt: null,
        verifiedAt: null
    };
}

export function ensureOtpActive(user) {
    const reset = user?.passwordReset;
    if (!reset?.otpHash || !reset?.expiresAt) {
        return false;
    }
    return new Date(reset.expiresAt).getTime() > Date.now();
}

export async function verifyOtp(user, otp) {
    if (!ensureOtpActive(user)) {
        return false;
    }
    return bcrypt.compare(otp, user.passwordReset.otpHash);
}

export function createResetToken({ userId, role }) {
    const secret = getEnvWithFallback('PASSWORD_RESET_JWT', ['RESET_JWT', 'JWT_SECRET', 'EMPLOYEE_JWT']);
    return jwt.sign({ id: userId, role, scope: 'password-reset' }, secret, { expiresIn: '15m' });
}

export function verifyResetToken(token, role) {
    const secret = getEnvWithFallback('PASSWORD_RESET_JWT', ['RESET_JWT', 'JWT_SECRET', 'EMPLOYEE_JWT']);
    const decoded = jwt.verify(token, secret);
    if (decoded.scope !== 'password-reset' || decoded.role !== role) {
        const err = new Error('Invalid reset token');
        err.statusCode = 401;
        throw err;
    }
    return decoded;
}

export function isWithinResetWindow(user) {
    const verifiedAt = user?.passwordReset?.verifiedAt;
    if (!verifiedAt) {
        return false;
    }
    return Date.now() - new Date(verifiedAt).getTime() <= OTP_REUSE_WINDOW_MS;
}
