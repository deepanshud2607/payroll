import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Loader2, Building2, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../lib/auth';
import * as api from '../lib/api';

function AuthLayout({ role, title, sub, children }) {
  const icons = { organization: Building2, admin: ShieldCheck, employee: User };
  const colors = {
    organization: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    admin: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    employee: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  };
  const Icon = icons[role] || User;
  const c = colors[role] || colors.employee;

  return (
    <div className="min-h-screen bg-[#050508] grid-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-neon-green/4 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-500/4 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-2 text-white/30 hover:text-white/60 mb-8 transition-colors text-sm">
          <ArrowLeft size={14} /> Back
        </Link>

        <div className="glass rounded-2xl p-8" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 mb-8">
            <div className={`w-10 h-10 rounded-xl ${c} border flex items-center justify-center`}>
              <Icon size={18} className={c.split(' ')[0]} />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-white">{title}</h1>
              <p className="text-xs text-white/30 font-mono">{sub}</p>
            </div>
          </div>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, required }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="input-field pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

function ForgotPasswordPanel({ role, identityLabel, identityKey, apiSet }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ identity: '', otp: '', resetToken: '', newPassword: '' });

  const requestOtp = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiSet.requestOtp({ [identityKey]: form.identity });
      setSuccess('OTP sent to your registered email.');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await apiSet.verifyOtp({ [identityKey]: form.identity, otp: form.otp });
      setForm((f) => ({ ...f, resetToken: data.resetToken || '' }));
      setSuccess('OTP verified. Set your new password.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiSet.resetPassword({ resetToken: form.resetToken, newPassword: form.newPassword });
      setSuccess('Password reset successful. You can now login with the new password.');
      setStep(1);
      setForm({ identity: '', otp: '', resetToken: '', newPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-white/40 hover:text-white/70 text-left"
      >
        Forgot password?
      </button>
    );
  }

  return (
    <div className="glass rounded-xl p-4 border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-white/40">Reset {role} password</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-white/40 hover:text-white/70">
          Close
        </button>
      </div>

      <Input
        label={identityLabel}
        value={form.identity}
        onChange={(e) => setForm({ ...form, identity: e.target.value })}
        placeholder={identityLabel}
        required
      />

      {step >= 2 && (
        <Input
          label="OTP"
          value={form.otp}
          onChange={(e) => setForm({ ...form, otp: e.target.value })}
          placeholder="6-digit OTP"
          required
        />
      )}

      {step >= 3 && (
        <Input
          label="New Password"
          type="password"
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          placeholder="••••••••"
          required
        />
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-neon-green">{success}</p>}

      <div className="flex items-center gap-2">
        {step === 1 && (
          <button type="button" onClick={requestOtp} disabled={loading} className="btn-primary text-xs px-3 py-2">
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        )}
        {step === 2 && (
          <button type="button" onClick={verifyOtp} disabled={loading} className="btn-primary text-xs px-3 py-2">
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        )}
        {step === 3 && (
          <button type="button" onClick={resetPassword} disabled={loading} className="btn-primary text-xs px-3 py-2">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Organization Login ────────────────────────────────────────────────────────
export function OrgLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.orgLogin(form);
      login(data.token, 'organization', {
        orgName: data.organization.name,
        email: data.organization.email,
        ...data.organization,
      });
      navigate('/org/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout role="organization" title="Organization Portal" sub="Sign in to manage your workforce">
      <form onSubmit={handle} className="space-y-4">
        <Input label="Email Address" type="email" value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} placeholder="org@company.com" required />
        <Input label="Password" type="password" value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-2 mt-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Sign In
        </button>
        <ForgotPasswordPanel
          role="organization"
          identityLabel="Organization Email"
          identityKey="email"
          apiSet={{
            requestOtp: api.orgRequestForgotOtp,
            verifyOtp: api.orgVerifyForgotOtp,
            resetPassword: api.orgResetForgotPassword,
          }}
        />
        <p className="text-center text-sm text-white/30 mt-4">
          No account?{' '}
          <Link to="/org/signup" className="text-blue-400 hover:text-blue-300">Register organization</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// ── Organization Signup ───────────────────────────────────────────────────────
export function OrgSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.orgSignup(form);
      navigate('/org/login', { state: { success: 'Organization registered! Please sign in.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout role="organization" title="Register Organization" sub="Set up your organization account">
      <form onSubmit={handle} className="space-y-4">
        <div className="pb-2 border-b border-white/5">
          <p className="text-xs font-display uppercase tracking-widest text-white/30 mb-3">Organization Details</p>
          <div className="space-y-3">
            <Input label="Organization Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme Corp" required />
            <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="admin@acme.com" required />
            <Input label="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required />
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Create Organization
        </button>
      </form>
    </AuthLayout>
  );
}

// ── Admin Login ───────────────────────────────────────────────────────────────
export function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ uniqueId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.adminLogin(form);
      login(data.token, 'admin', {
        fullName: data.admin.fullName,
        uniqueId: data.admin.uniqueId,
        ...data.admin,
      });
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout role="admin" title="Admin Portal" sub="Sign in with your admin credentials">
      <form onSubmit={handle} className="space-y-4">
        <Input label="Admin Unique ID" value={form.uniqueId}
          onChange={e => setForm({ ...form, uniqueId: e.target.value })} placeholder="ADMIN001" required />
        <Input label="Password" type="password" value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-400 text-white"
          style={{ boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Sign In as Admin
        </button>
        <ForgotPasswordPanel
          role="admin"
          identityLabel="Admin Unique ID"
          identityKey="uniqueId"
          apiSet={{
            requestOtp: api.adminRequestForgotOtp,
            verifyOtp: api.adminVerifyForgotOtp,
            resetPassword: api.adminResetForgotPassword,
          }}
        />
      </form>
    </AuthLayout>
  );
}

// ── Employee Login ────────────────────────────────────────────────────────────
export function EmpLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ uniqueEmployeeId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.empLogin(form);
      login(data.token, 'employee', {
        uniqueEmployeeId: data.employee.uniqueEmployeeId,
        ...data.employee,
      });
      navigate('/employee/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout role="employee" title="Employee Portal" sub="Sign in with your employee ID">
      <form onSubmit={handle} className="space-y-4">
        <Input label="Employee ID" value={form.uniqueEmployeeId}
          onChange={e => setForm({ ...form, uniqueEmployeeId: e.target.value })} placeholder="25ACME0001" required />
        <Input label="Password" type="password" value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Sign In
        </button>
        <ForgotPasswordPanel
          role="employee"
          identityLabel="Employee ID"
          identityKey="uniqueEmployeeId"
          apiSet={{
            requestOtp: api.empRequestForgotOtp,
            verifyOtp: api.empVerifyForgotOtp,
            resetPassword: api.empResetForgotPassword,
          }}
        />
        <p className="text-center text-sm text-white/30 mt-4">
          New employee?{' '}
          <Link to="/employee/signup" className="text-neon-green hover:text-neon-green/80">Register here</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// ── Employee Signup ───────────────────────────────────────────────────────────
export function EmpSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', department: '',
    salary: '', organizationId: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.empSignup({ ...form, salary: Number(form.salary) });
      navigate('/employee/login', { state: { success: 'Account created! Your ID will be assigned after approval.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout role="employee" title="Employee Registration" sub="Register and await approval from your organization">
      <form onSubmit={handle} className="space-y-3">
        <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" required />
        <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@company.com" required />
        <Input label="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required />
        <Input label="Department" value={form.department} onChange={e => set('department', e.target.value)} placeholder="Engineering" required />
        <Input label="Expected Salary (₹)" type="number" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="40000" required />
        <div>
          <label className="label">Organization ID</label>
          <input
            value={form.organizationId}
            onChange={e => set('organizationId', e.target.value)}
            placeholder="Ask your HR for the Organization ID"
            required
            className="input-field font-mono text-xs"
          />
          <p className="text-xs text-white/20 mt-1">Paste the MongoDB ID provided by your organization</p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-2 mt-2">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Register
        </button>
      </form>
    </AuthLayout>
  );
}

