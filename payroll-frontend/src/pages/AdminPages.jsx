import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CreditCard, Clock, CheckCircle, XCircle, Loader2, Plus, Wallet, DollarSign, Lock, Eye, EyeOff } from 'lucide-react';
import { StatCard, Modal, Empty, Spinner } from '../components/ui';
import * as api from '../lib/api';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export function AdminDashboard() {
  const [data, setData] = useState({ employees: [], unpaid: [], paid: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.adminEmployees(), api.adminUnpaidPayments(), api.adminPaidPayments()])
      .then(([e, u, p]) => {
        setData({
          employees: e.data.employees || [],
          unpaid: u.data.unpaidEmployees || [],
          paid: p.data.paidEmployees || [],
          monthKey: u.data.monthKey,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-purple-400 w-8 h-8" /></div>;

  const total = data.employees.length;
  const approved = data.employees.filter(e => e.approval?.status === 'approved').length;
  const pending = data.employees.filter(e => e.approval?.status === 'pending').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-extrabold text-3xl text-white">Admin Dashboard</h1>
        <p className="text-white/30 text-sm mt-1">{data.monthKey}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={total} icon={Users} color="purple" delay={0} />
        <StatCard label="Approved" value={approved} icon={CheckCircle} color="green" delay={0.05} />
        <StatCard label="Pending" value={pending} icon={Clock} color="yellow" delay={0.1} />
        <StatCard label="Paid This Month" value={data.paid.length} icon={CreditCard} color="blue" delay={0.15} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white">Unpaid This Month</h2>
            <span className="badge-pending">{data.unpaid.length}</span>
          </div>
          {data.unpaid.length === 0
            ? <Empty icon={CheckCircle} title="All paid!" />
            : <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.unpaid.map(emp => (
                  <div key={emp.id} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{emp.name}</p>
                      <p className="text-xs font-mono text-white/30">{emp.uniqueEmployeeId}</p>
                    </div>
                    <p className="text-sm font-mono text-yellow-400">{fmt(emp.salary)}</p>
                  </div>
                ))}
              </div>
          }
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white">Paid This Month</h2>
            <span className="badge-approved">{data.paid.length}</span>
          </div>
          {data.paid.length === 0
            ? <Empty icon={CreditCard} title="No payments yet" />
            : <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.paid.map(emp => (
                  <div key={emp.id} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{emp.name}</p>
                      <p className="text-xs font-mono text-white/30">{emp.uniqueEmployeeId}</p>
                    </div>
                    <p className="text-sm font-mono text-neon-green">{fmt(emp.payment?.amount)}</p>
                  </div>
                ))}
              </div>
          }
        </motion.div>
      </div>
    </div>
  );
}

export function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.adminEmployees().then(r => setEmployees(r.data.employees || [])).finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    (e.uniqueEmployeeId || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-purple-400 w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-white">Employees</h1>
          <p className="text-white/30 text-sm mt-1">{employees.length} in your organization</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search..." className="input-field w-56 text-sm" />
      </div>
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-xs font-display uppercase tracking-widest text-white/30">
          <span className="col-span-3">Name</span>
          <span className="col-span-2">ID</span>
          <span className="col-span-2">Department</span>
          <span className="col-span-2">Salary</span>
          <span className="col-span-3">Status</span>
        </div>
        {filtered.map((emp, i) => (
          <motion.div key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
            className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
            <div className="col-span-3">
              <p className="text-sm font-medium text-white">{emp.name}</p>
              <p className="text-xs text-white/30">{emp.email}</p>
            </div>
            <div className="col-span-2"><p className="text-xs font-mono text-white/50">{emp.uniqueEmployeeId || '—'}</p></div>
            <div className="col-span-2"><p className="text-sm text-white/70">{emp.department}</p></div>
            <div className="col-span-2"><p className="text-sm font-mono text-purple-400">{fmt(emp.salary)}</p></div>
            <div className="col-span-3">
              <span className={emp.approval?.status === 'approved' ? 'badge-approved' : emp.approval?.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}>
                {emp.approval?.status || 'pending'}
              </span>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <Empty icon={Users} title="No employees" />}
      </div>
    </div>
  );
}

export function AdminApprovals() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState('');

  const load = () => {
    setLoading(true);
    api.adminPendingEmployees().then(r => setPending(r.data.pendingRequests || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id, value) => {
    setActionId(id);
    try {
      await api.adminApproveEmployee(id, value);
      setToast(value ? 'Employee approved!' : 'Employee rejected');
      load();
    } catch (err) { setToast(err.response?.data?.error || 'Error'); }
    finally { setActionId(null); setTimeout(() => setToast(''), 3000); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-purple-400 w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-3xl text-white">Approval Requests</h1>
        <p className="text-white/30 text-sm mt-1">{pending.length} pending</p>
      </div>
      {toast && <div className="glass rounded-xl px-4 py-3 text-sm text-purple-400 border border-purple-500/20">{toast}</div>}
      {pending.length === 0 ? (
        <div className="glass rounded-2xl p-12"><Empty icon={CheckCircle} title="No pending approvals" sub="All caught up!" /></div>
      ) : (
        <div className="space-y-3">
          {pending.map((emp, i) => (
            <motion.div key={emp.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center text-sm font-display font-bold text-purple-400 flex-shrink-0">
                  {emp.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{emp.name}</p>
                  <p className="text-xs text-white/30 font-mono">{emp.email} · {emp.department}</p>
                  <p className="text-xs font-mono text-purple-400 mt-0.5">{fmt(emp.salary)}/month</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => approve(emp.id, true)} disabled={actionId === emp.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 text-sm hover:bg-neon-green/20 transition-colors disabled:opacity-50">
                  {actionId === emp.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                  Approve
                </button>
                <button onClick={() => approve(emp.id, false)} disabled={actionId === emp.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50">
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminPayroll() {
  const [unpaid, setUnpaid] = useState([]);
  const [paid, setPaid] = useState([]);
  const [sourceAccounts, setSourceAccounts] = useState([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [accountNotice, setAccountNotice] = useState('');
  const [monthKey, setMonthKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null);
  const [adjustment, setAdjustment] = useState({ type: 'none', amount: '' });
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([api.adminUnpaidPayments(), api.adminPaidPayments()])
      .then(([u, p]) => {
        setUnpaid(u.data.unpaidEmployees || []);
        setPaid(p.data.paidEmployees || []);
        setSourceAccounts(u.data.sourceAccounts || []);
        setSourceAccountId((u.data.sourceAccounts || [])[0]?.id || '');
        setAccountNotice(u.data.sourceAccountRequiredNotice || '');
        setMonthKey(u.data.monthKey);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const payOne = async () => {
    if (!payModal || payModal === 'all') return;
    if (!sourceAccountId) {
      setToast('Please add a bank account first.');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    setPaying(true);
    try {
      await api.adminPayOne({
        employeeId: payModal.id,
        sourceAccountId,
        adjustmentType: adjustment.type,
        adjustmentAmount: Number(adjustment.amount) || 0
      });
      setToast(`Paid ${payModal.name}!`);
      setPayModal(null);
      load();
    } catch (err) { setToast(err.response?.data?.error || 'Payment failed'); }
    finally { setPaying(false); setTimeout(() => setToast(''), 3000); }
  };

  const payAll = async () => {
    if (!sourceAccountId) {
      setToast('Please add a bank account first.');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    setPaying(true);
    try {
      await api.adminPayAll({
        sourceAccountId,
        adjustmentType: adjustment.type,
        adjustmentAmount: Number(adjustment.amount) || 0
      });
      setToast('Bulk payroll completed!');
      setPayModal(null);
      load();
    } catch (err) { setToast(err.response?.data?.error || 'Failed'); }
    finally { setPaying(false); setTimeout(() => setToast(''), 3000); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-purple-400 w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-white">Payroll</h1>
          <p className="text-white/30 text-sm mt-1">{monthKey}</p>
        </div>
        {unpaid.length > 0 && (
          <button onClick={() => { setAdjustment({ type: 'none', amount: '' }); setPayModal('all'); }}
            className="btn-primary flex items-center gap-2" style={{ background: '#8B5CF6', boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}>
            <CreditCard size={16} /> Pay All ({unpaid.length})
          </button>
        )}
      </div>
      {toast && <div className="glass rounded-xl px-4 py-3 text-sm text-purple-400 border border-purple-500/20">{toast}</div>}
      {accountNotice && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-yellow-300 border border-yellow-500/20">
          {accountNotice}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white">Pending</h2>
            <span className="badge-pending">{unpaid.length}</span>
          </div>
          <div className="space-y-2">
            {unpaid.map(emp => (
              <div key={emp.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{emp.name}</p>
                  <p className="text-xs font-mono text-white/30">{emp.uniqueEmployeeId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-mono text-yellow-400">{fmt(emp.salary)}</p>
                  <button onClick={() => { setAdjustment({ type: 'none', amount: '' }); setPayModal(emp); }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                    Pay
                  </button>
                </div>
              </div>
            ))}
            {unpaid.length === 0 && <Empty icon={CheckCircle} title="All paid!" />}
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white">Completed</h2>
            <span className="badge-approved">{paid.length}</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {paid.map(emp => (
              <div key={emp.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{emp.name}</p>
                  <p className="text-xs font-mono text-white/30">{emp.uniqueEmployeeId}</p>
                </div>
                <p className="text-sm font-mono text-purple-400">{fmt(emp.payment?.amount)}</p>
              </div>
            ))}
            {paid.length === 0 && <Empty icon={CreditCard} title="No payments yet" />}
          </div>
        </div>
      </div>

      <Modal isOpen={!!payModal && payModal !== 'all'} onClose={() => setPayModal(null)} title={`Pay ${payModal?.name}`}>
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-white/50">Base Salary</p>
            <p className="font-display font-bold text-2xl text-purple-400">{fmt(payModal?.salary)}</p>
          </div>
          <div>
            <label className="label">Adjustment</label>
            <select value={adjustment.type} onChange={e => setAdjustment({ ...adjustment, type: e.target.value })} className="input-field">
              <option value="none">No Adjustment</option>
              <option value="raise">Raise</option>
              <option value="deduct">Deduct</option>
            </select>
          </div>
          {adjustment.type !== 'none' && (
            <div>
              <label className="label">Amount (₹)</label>
              <input type="number" value={adjustment.amount} onChange={e => setAdjustment({ ...adjustment, amount: e.target.value })} className="input-field" placeholder="0" />
            </div>
          )}
          <div>
            <label className="label">Pay From Account</label>
            <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="input-field">
              {sourceAccounts.length === 0 && <option value="">No account available</option>}
              {sourceAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountLabel} ({account.ownerRole})
                </option>
              ))}
            </select>
          </div>
          <button onClick={payOne} disabled={paying}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-display font-semibold text-white transition-all"
            style={{ background: '#8B5CF6', boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}>
            {paying && <Loader2 size={16} className="animate-spin" />} Confirm Payment
          </button>
        </div>
      </Modal>

      <Modal isOpen={payModal === 'all'} onClose={() => setPayModal(null)} title="Bulk Payroll">
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-white/50">Paying</p>
            <p className="font-display font-bold text-2xl text-purple-400">{unpaid.length} employees</p>
          </div>
          <div>
            <label className="label">Adjustment</label>
            <select value={adjustment.type} onChange={e => setAdjustment({ ...adjustment, type: e.target.value })} className="input-field">
              <option value="none">No Adjustment</option>
              <option value="raise">Raise for All</option>
              <option value="deduct">Deduct from All</option>
            </select>
          </div>
          {adjustment.type !== 'none' && (
            <div>
              <label className="label">Amount (₹)</label>
              <input type="number" value={adjustment.amount} onChange={e => setAdjustment({ ...adjustment, amount: e.target.value })} className="input-field" placeholder="0" />
            </div>
          )}
          <div>
            <label className="label">Pay From Account</label>
            <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="input-field">
              {sourceAccounts.length === 0 && <option value="">No account available</option>}
              {sourceAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountLabel} ({account.ownerRole})
                </option>
              ))}
            </select>
          </div>
          <button onClick={payAll} disabled={paying}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-display font-semibold text-white"
            style={{ background: '#8B5CF6', boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}>
            {paying && <Loader2 size={16} className="animate-spin" />} Run Payroll
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function AdminProfile() {
  const [me, setMe] = useState(null);
  const [orgAccounts, setOrgAccounts] = useState([]);
  const [orgMeta, setOrgMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bank, setBank] = useState({ bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branch: '' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ old: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.adminMe().then(r => {
      setMe(r.data.admin);
      setOrgAccounts(r.data.organizationBankAccounts || []);
      setOrgMeta(r.data.organizationMeta || null);
    }).finally(() => setLoading(false));
  }, []);

  const addBank = async () => {
    setSaving(true);
    try {
      await api.adminAddBank(bank);
      setToast('Bank account added!');
      setBank({ bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branch: '' });
      api.adminMe().then(r => {
        setMe(r.data.admin);
        setOrgAccounts(r.data.organizationBankAccounts || []);
        setOrgMeta(r.data.organizationMeta || null);
      });
    } catch (err) { setToast(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); setTimeout(() => setToast(''), 3000); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setToast('New password and confirm password do not match');
      setTimeout(() => setToast(''), 3000);
      return;
    }

    setSaving(true);
    try {
      await api.adminChangePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      setToast('Password changed successfully');
      setPasswordForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setToast(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-purple-400 w-8 h-8" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-display font-extrabold text-3xl text-white">My Profile</h1>
      {toast && <div className="glass rounded-xl px-4 py-3 text-sm text-purple-400 border border-purple-500/20">{toast}</div>}

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl font-display font-bold text-purple-400">
            {me?.fullName?.charAt(0)}
          </div>
          <div>
            <p className="font-display font-bold text-xl text-white">{me?.fullName}</p>
            <p className="text-sm font-mono text-purple-400">{me?.uniqueId}</p>
          </div>
        </div>
        {[['Email', me?.email], ['Salary', fmt(me?.salary)]].map(([l, v]) => (
          <div key={l} className="flex justify-between py-3 border-b border-white/5 last:border-0">
            <span className="text-sm text-white/40">{l}</span>
            <span className="text-sm font-mono text-white">{v}</span>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-bold text-white">Bank Accounts</h2>
        {(me?.bankAccounts || []).map((b, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <p className="font-medium text-white">{b.bankName}</p>
            <p className="text-xs font-mono text-white/40">{b.accountNumber} · {b.ifscCode}</p>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
          {[['Bank Name', 'bankName'], ['Account Holder', 'accountHolderName'],
            ['Account Number', 'accountNumber'], ['IFSC Code', 'ifscCode'], ['Branch', 'branch']].map(([l, k]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input value={bank[k]} onChange={e => setBank({ ...bank, [k]: e.target.value })} className="input-field" />
            </div>
          ))}
        </div>
        <button onClick={addBank} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-display font-semibold text-white text-sm"
          style={{ background: '#8B5CF6', boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          <Plus size={14} /> Add Bank Account
        </button>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-bold text-white">Organization Accounts (Payroll Source)</h2>
        <p className="text-xs text-white/35">Visible for payroll usage hierarchy. Full account details are hidden.</p>
        {orgMeta && <p className="text-xs text-purple-300">{orgMeta.name} ({orgMeta.code})</p>}
        {orgAccounts.length === 0 && <p className="text-sm text-white/35">No organization account added yet.</p>}
        {orgAccounts.map((b) => (
          <div key={b.id} className="glass rounded-xl p-4">
            <p className="font-medium text-white">{b.bankName}</p>
            <p className="text-xs font-mono text-white/40">{b.maskedAccountNumber} · {b.ifscCode}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-purple-400" />
          <h2 className="font-display font-bold text-white">Change Password</h2>
        </div>
        <form onSubmit={changePassword} className="space-y-3">
          {[
            ['Current Password', 'oldPassword', 'old'],
            ['New Password', 'newPassword', 'next'],
            ['Confirm New Password', 'confirm', 'confirm']
          ].map(([label, key, showKey]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="relative">
                <input
                  type={showPwd[showKey] ? 'text' : 'password'}
                  value={passwordForm[key]}
                  onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })}
                  required
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd({ ...showPwd, [showKey]: !showPwd[showKey] })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPwd[showKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-display font-semibold text-white text-sm"
            style={{ background: '#8B5CF6', boxShadow: '0 0 20px rgba(139,92,246,0.2)' }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

