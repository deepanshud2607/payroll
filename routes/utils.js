export function getFinancialYearYY(date = new Date()) {
    const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    return String(year % 100).padStart(2, '0');
}

export function getOrganizationCode(name = '') {
    const letters = name.replace(/[^a-z]/gi, '').toUpperCase();
    return (letters.slice(0, 2) || 'XX').padEnd(2, 'X');
}

export function getMonthKey(date = new Date()) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
}

export function applySalaryAdjustment(baseSalary, adjustmentType, adjustmentAmount) {
    if (adjustmentType === 'raise') {
        return baseSalary + adjustmentAmount;
    }
    if (adjustmentType === 'deduct') {
        return Math.max(0, baseSalary - adjustmentAmount);
    }
    return baseSalary;
}

export function formatZodError(error) {
    return error.issues
        .map((issue) => {
            const path = issue.path?.length ? `${issue.path.join('.')} - ` : '';
            return `${path}${issue.message}`;
        })
        .join(', ');
}

export function isEmployeeApproved(employee, hasAdmins = true) {
    if (!employee?.approval) {
        return false;
    }
    if (!hasAdmins) {
        return Boolean(employee.approval.organizationApproved);
    }
    return Boolean(employee.approval.organizationApproved && employee.approval.adminApproved);
}

export function hasPaidForMonth(paymentHistory = [], monthKey) {
    return paymentHistory.some((item) => item.monthKey === monthKey && item.status === 'paid');
}

export function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        const err = new Error('Authentication service is not configured. Please contact support.');
        err.statusCode = 500;
        throw err;
    }
    return value;
}

export function getEnvWithFallback(primary, fallbacks = []) {
    const candidates = [primary, ...fallbacks];
    for (const key of candidates) {
        if (process.env[key]) {
            return process.env[key];
        }
    }

    const err = new Error('Authentication service is not configured. Please contact support.');
    err.statusCode = 500;
    throw err;
}
