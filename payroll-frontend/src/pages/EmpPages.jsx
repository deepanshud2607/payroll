import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, CreditCard, TrendingUp, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { StatCard, Empty, Spinner } from '../components/ui';
import * as api from '../lib/api';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export function EmpDashboard() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.empMe().then(r => setMe(r.data.employee)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-neon-green w-8 h-8" /></div>;
  if (!me) return null;

  const statusIcon = {
    approved: <CheckCircle size={16} className="text-neon-green" />,
    pending: <Clock size={16} className="text-yellow-400" />,
    rejected: <XCircle size={16} className="text-red-400" />,
  }[me.approval?.status] || null;

  const paidHistory = (me.paymentHistory || []).slice().reverse();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 relative overflow-hidden"
        style={{ border: '1px solid rgba(0,255,163,0.1)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        </div>
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-neon-green/15 border border-neon-green/25 flex items-center justify-center text-2xl font-display font-extrabold text-neon-green">
                {me.name.charAt(0)}
              </div>
              <div>
                <h1 className="font-display font-extrabold text-2xl text-white">{me.name}</h1>
                <p className="text-sm font-mono text-white/40">{me.uniqueEmployeeId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass text-sm">
              {statusIcon}
              <span className={
                me.approval?.status === 'approved' ? 'text-neon-green' :
                me.approval?.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'
              }>
                {me.approval?.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-white/30 font-mono mb-1">Department</p>
              <p className="font-display font-semibold text-white">{me.department}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-white/30 font-mono mb-1">Monthly Salary</p>
              <p className="font-display font-semibold text-neon-green">{fmt(me.salary)}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-white/30 font-mono mb-1">Organization</p>
              <p className="font-display font-semibold text-white">{me.organization?.name || '—'}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-white/30 font-mono mb-1">This Month</p>
              <p className={`font-display font-semibold ${me.paidStatus === 'paid' ? 'text-neon-green' : 'text-yellow-400'}`}>
                {me.paidStatus === 'paid' ? '✓ Paid' : '⏳ Pending'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment status card */}
      {me.paidStatus === 'paid' ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-green rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-neon-green/15 border border-neon-green/25">
            <CreditCard size={24} className="text-neon-green" />
          </div>
          <div>
            <p className="font-display font-bold text-neon-green">Salary Credited!</p>
            <p className="text-sm text-white/50">Your salary for {me.monthKey} has been processed</p>
          </div>
          <div className="ml-auto text-right">
            <p className="font-display font-bold text-2xl text-neon-green">{fmt(me.salary)}</p>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 flex items-center gap-4"
          style={{ border: '1px solid rgba(234,179,8,0.15)' }}>
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Clock size={24} className="text-yellow-400" />
          </div>
          <div>
            <p className="font-display font-bold text-yellow-400">Payment Pending</p>
            <p className="text-sm text-white/50">Your salary for {me.monthKey} hasn't been processed yet</p>
          </div>
        </motion.div>
      )}

      {/* Payment History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6">
        <h2 className="font-display font-bold text-white mb-4">Payment History</h2>
        {paidHistory.length === 0 ? (
          <Empty icon={CreditCard} title="No payments yet" sub="Your payment history will appear here" />
        ) : (
          <div className="space-y-2">
            {paidHistory.map((p, i) => (
              <motion.div key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
                    <CreditCard size={12} className="text-neon-green" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{p.monthKey}</p>
                    <p className="text-xs text-white/30">Paid by {p.paidByRole}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-neon-green">{fmt(p.amount)}</p>
                  {p.adjustment?.type !== 'none' && (
                    <p className="text-xs text-white/30">{p.adjustment.type} {fmt(p.adjustment.amount)}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function EmpSettings() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [show, setShow] = useState({ old: false, new: false });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });

  const handle = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setToast({ msg: "Passwords don't match", type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await api.empChangePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword });
      setToast({ msg: 'Password changed!', type: 'success' });
      setForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Failed', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setToast({ msg: '', type: '' }), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="font-display font-extrabold text-3xl text-white">Settings</h1>

      {toast.msg && (
        <div className={`glass rounded-xl px-4 py-3 text-sm border ${toast.type === 'success' ? 'text-neon-green border-neon-green/20' : 'text-red-400 border-red-500/20'}`}>
          {toast.msg}
        </div>
      )}

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-neon-green/10 border border-neon-green/20">
            <Lock size={18} className="text-neon-green" />
          </div>
          <div>
            <h2 className="font-display font-bold text-white">Change Password</h2>
            <p className="text-xs text-white/30">Keep your account secure</p>
          </div>
        </div>

        <form onSubmit={handle} className="space-y-4">
          {[
            ['Current Password', 'oldPassword', 'old'],
            ['New Password', 'newPassword', 'new'],
          ].map(([label, key, showKey]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="relative">
                <input
                  type={show[showKey] ? 'text' : 'password'}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  required
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShow({ ...show, [showKey]: !show[showKey] })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {show[showKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              required className="input-field" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

