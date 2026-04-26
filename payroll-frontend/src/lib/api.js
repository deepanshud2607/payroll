import axios from 'axios';

const BASE =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

const api = axios.create({ baseURL: BASE });

// Auto-inject token
api.interceptors.request.use((config) => {
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const requestUrl = err.config?.url || '';
    const isAuthAttempt =
      requestUrl.includes('/login') ||
      requestUrl.includes('/forgot-password/request-otp') ||
      requestUrl.includes('/forgot-password/verify-otp') ||
      requestUrl.includes('/forgot-password/reset');

    if (err.response?.status === 401 && !isAuthAttempt) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ── Organization ──────────────────────────────────────────────────────────────
export const orgSignup = (data) => api.post('/organization/v1/signup', data);
export const orgLogin = (data) => api.post('/organization/v1/login', data);
export const orgRequestForgotOtp = (data) => api.post('/organization/v1/forgot-password/request-otp', data);
export const orgVerifyForgotOtp = (data) => api.post('/organization/v1/forgot-password/verify-otp', data);
export const orgResetForgotPassword = (data) => api.post('/organization/v1/forgot-password/reset', data);
export const orgMe = () => api.get('/organization/v1/me');
export const orgChangePassword = (data) => api.patch('/organization/v1/change-password', data);
export const orgCreateAdmin = (data) => api.post('/organization/v1/admins', data);
export const orgAdmins = () => api.get('/organization/v1/admins');
export const orgUpdateBranding = (data) => api.patch('/organization/v1/branding', data);
export const orgAddBank = (data) => api.post('/organization/v1/banks', data);
export const orgEmployees = () => api.get('/organization/v1/employees');
export const orgPendingEmployees = () => api.get('/organization/v1/employees/pending');
export const orgApproveEmployee = (id, approve) =>
  api.patch(`/organization/v1/employees/${id}/approve`, { approve });
export const orgUnpaidPayments = () => api.get('/organization/v1/payments/unpaid');
export const orgPaidPayments = () => api.get('/organization/v1/payments/paid');
export const orgPayOne = (data) => api.post('/organization/v1/payments/pay-one', data);
export const orgPayAll = (data) => api.post('/organization/v1/payments/pay-all', data);
export const orgPayAdmin = (data) => api.post('/organization/v1/payments/pay-admin', data);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminLogin = (data) => api.post('/admin/v1/login', data);
export const adminRequestForgotOtp = (data) => api.post('/admin/v1/forgot-password/request-otp', data);
export const adminVerifyForgotOtp = (data) => api.post('/admin/v1/forgot-password/verify-otp', data);
export const adminResetForgotPassword = (data) => api.post('/admin/v1/forgot-password/reset', data);
export const adminMe = () => api.get('/admin/v1/me');
export const adminChangePassword = (data) => api.patch('/admin/v1/change-password', data);
export const adminAddBank = (data) => api.post('/admin/v1/banks', data);
export const adminEmployees = () => api.get('/admin/v1/employees');
export const adminPendingEmployees = () => api.get('/admin/v1/employees/pending');
export const adminApproveEmployee = (id, approve) =>
  api.patch(`/admin/v1/employees/${id}/approve`, { approve });
export const adminUnpaidPayments = () => api.get('/admin/v1/payments/unpaid');
export const adminPaidPayments = () => api.get('/admin/v1/payments/paid');
export const adminPayOne = (data) => api.post('/admin/v1/payments/pay-one', data);
export const adminPayAll = (data) => api.post('/admin/v1/payments/pay-all', data);

// ── Employee ──────────────────────────────────────────────────────────────────
export const empSignup = (data) => api.post('/employee/v1/signup', data);
export const empLogin = (data) => api.post('/employee/v1/login', data);
export const empRequestForgotOtp = (data) => api.post('/employee/v1/forgot-password/request-otp', data);
export const empVerifyForgotOtp = (data) => api.post('/employee/v1/forgot-password/verify-otp', data);
export const empResetForgotPassword = (data) => api.post('/employee/v1/forgot-password/reset', data);
export const empMe = () => api.get('/employee/v1/me');
export const empChangePassword = (data) => api.patch('/employee/v1/change-password', data);

