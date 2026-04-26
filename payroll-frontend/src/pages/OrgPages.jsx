import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CreditCard, Clock, TrendingUp, DollarSign, CheckCircle, XCircle, Loader2, Plus, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { StatCard, Modal, Empty, Spinner } from '../components/ui';
import * as api from '../lib/api';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export function OrgDashboard() {
  const [data, setData] = useState({ employees: [], unpaid: [], paid: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.orgEmployees(), api.orgUnpaidPayments(), api.orgPaidPayments()])
      .then(([e, u, p]) => {
        setData({
          employees: e.data.employees || [],
          unpaid: u.data.unpaidEmployees || [],
          paid: p.data.paidEmployees || [],
          unpaidAdmins: u.data.unpaidAdmins || [],
          paidAdmins: p.data.paidAdmins || [],
          monthKey: u.data.monthKey,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-neon-green w-8 h-8" /></div>;

  const total = data.employees.length;
  const approved = data.employees.filter(e => e.approval?.status === 'approved').length;
  const pending = data.employees.filter(e => e.approval?.status === 'pending').length;
  const totalPayroll = data.employees.filter(e => e.approval?.status === 'approved').reduce((s, e) => s + e.salary, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-extrabold text-3xl text-white">Overview</h1>
        <p className="text-white/30 font-body text-sm mt-1">
          {data.monthKey} · {total} employees registered
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={total} icon={Users} color="blue" delay={0} />
        <StatCard label="Approved" value={approved} icon={CheckCircle} color="green" delay={0.05} />
        <StatCard label="Pending" value={pending} icon={Clock} color="yellow" delay={0.1} />
        <StatCard label="Monthly Payroll" value={fmt(totalPayroll)} icon={DollarSign} color="purple" delay={0.15} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Unpaid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white">Unpaid This Month</h2>
            <span className="badge-pending">{data.unpaid.length}</span>
          </div>
          {data.unpaid.length === 0 ? (
            <Empty icon={CheckCircle} title="All paid!" sub="Everyone has been paid this month" />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {data.unpaid.map(emp => (
                <div key={emp.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{emp.name}</p>
                    <p className="text-xs font-mono text-white/30">{emp.uniqueEmployeeId}</p>
                  </div>
                  <p className="text-sm font-mono text-yellow-400">{fmt(emp.salary)}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Paid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white">Paid This Month</h2>
            <span className="badge-approved">{data.paid.length}</span>
          </div>
          {data.paid.length === 0 ? (
            <Empty icon={CreditCard} title="No payments yet" sub="Run payroll to see payments here" />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {data.paid.map(emp => (
                <div key={emp.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{emp.name}</p>
                    <p className="text-xs font-mono text-white/30">{emp.uniqueEmployeeId}</p>
                  </div>
                  <p className="text-sm font-mono text-neon-green">{fmt(emp.payment?.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ── Org Employees ─────────────────────────────────────────────────────────────
export function OrgEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.orgEmployees().then(r => setEmployees(r.data.employees || [])).finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    e.uniqueEmployeeId?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-neon-green w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-white">Employees</h1>
          <p className="text-white/30 text-sm mt-1">{employees.length} total</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search employees..."
          className="input-field w-56 text-sm"
        />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/5 text-xs font-display uppercase tracking-widest text-white/30">
          <span className="col-span-3">Name</span>
          <span className="col-span-2">ID</span>
          <span className="col-span-2">Department</span>
          <span className="col-span-2">Salary</span>
          <span className="col-span-3">Status</span>
        </div>
        {filtered.length === 0 && (
          <Empty icon={Users} title="No employees found" sub="Try a different search" />
        )}
        {filtered.map((emp, i) => (
          <motion.div
            key={emp.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors"
          >
            <div className="col-span-3">
              <p className="text-sm font-medium text-white">{emp.name}</p>
              <p className="text-xs text-white/30">{emp.email}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-mono text-white/50">{emp.uniqueEmployeeId || '—'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-white/70">{emp.department}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-mono text-neon-green">{fmt(emp.salary)}</p>
            </div>
            <div className="col-span-3">
              <span className={
                emp.approval?.status === 'approved' ? 'badge-approved' :
                emp.approval?.status === 'rejected' ? 'badge-rejected' : 'badge-pending'
              }>
                {emp.approval?.status || 'pending'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Org Approvals ─────────────────────────────────────────────────────────────
export function OrgApprovals() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState('');

  const load = () => {
    setLoading(true);
    api.orgPendingEmployees().then(r => setPending(r.data.pendingRequests || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (id, value) => {
    setActionId(id);
    try {
      await api.orgApproveEmployee(id, value);
      setToast(value ? 'Employee approved!' : 'Employee rejected');
      load();
    } catch (err) {
      setToast(err.response?.data?.error || 'Error');
    } finally {
      setActionId(null);
      setTimeout(() => setToast(''), 3000);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-neon-green w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-3xl text-white">Approval Requests</h1>
        <p className="text-white/30 text-sm mt-1">{pending.length} pending</p>
      </div>
      {toast && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-neon-green border border-neon-green/20">{toast}</div>
      )}
      {pending.length === 0 ? (
        <div className="glass rounded-2xl p-12">
          <Empty icon={CheckCircle} title="No pending approvals" sub="All caught up!" />
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20 flex items-center justify-center text-sm font-display font-bold text-yellow-400 flex-shrink-0">
                  {emp.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{emp.name}</p>
                  <p className="text-xs text-white/30 font-mono">{emp.email} · {emp.department}</p>
                  <p className="text-xs font-mono text-neon-green mt-0.5">{fmt(emp.salary)}/month</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => approve(emp.id, true)}
                  disabled={actionId === emp.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 text-sm hover:bg-neon-green/20 transition-colors disabled:opacity-50"
                >
                  {actionId === emp.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                  Approve
                </button>
                <button
                  onClick={() => approve(emp.id, false)}
                  disabled={actionId === emp.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Org Payroll ───────────────────────────────────────────────────────────────
export function OrgPayroll() {
  const [unpaid, setUnpaid] = useState([]);
  const [paid, setPaid] = useState([]);
  const [sourceAccounts, setSourceAccounts] = useState([]);
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [accountNotice, setAccountNotice] = useState('');
  const [monthKey, setMonthKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null); // 'all' | employee obj
  const [adjustment, setAdjustment] = useState({ type: 'none', amount: '' });
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState('');
  const [includeAdmin, setIncludeAdmin] = useState(false);
  const [unpaidAdmins, setUnpaidAdmins] = useState([]);

  const load = () => {
    setLoading(true);
    Promise.all([api.orgUnpaidPayments(), api.orgPaidPayments()])
      .then(([u, p]) => {
        setUnpaid(u.data.unpaidEmployees || []);
        setPaid(p.data.paidEmployees || []);
        setSourceAccounts(u.data.sourceAccounts || []);
        setSourceAccountId((u.data.sourceAccounts || [])[0]?.id || '');
        setAccountNotice(u.data.sourceAccountRequiredNotice || '');
        setMonthKey(u.data.monthKey);
        setUnpaidAdmins(u.data.unpaidAdmins || []);
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
      if (payModal.type === 'admin') {
        await api.orgPayAdmin({
          adminId: payModal.id,
          sourceAccountId
        });
        setToast(`Paid ${payModal.fullName}!`);
      } else {
        await api.orgPayOne({
          employeeId: payModal.id,
          sourceAccountId,
          adjustmentType: adjustment.type,
          adjustmentAmount: Number(adjustment.amount) || 0
        });
        setToast(`Paid ${payModal.name}!`);
      }
      setPayModal(null);
      load();
    } catch (err) {
      setToast(err.response?.data?.error || 'Payment failed');
    } finally {
      setPaying(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  const payAll = async () => {
    if (!sourceAccountId) {
      setToast('Please add a bank account first.');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    setPaying(true);
    try {
      await api.orgPayAll({
        sourceAccountId,
        adjustmentType: adjustment.type,
        adjustmentAmount: Number(adjustment.amount) || 0,
        includeAdmin
      });
      setToast('Bulk payroll completed!');
      setPayModal(null);
      load();
    } catch (err) {
      setToast(err.response?.data?.error || 'Bulk payment failed');
    } finally {
      setPaying(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-neon-green w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-white">Payroll Hub</h1>
          <p className="text-white/30 text-sm mt-1">{monthKey}</p>
        </div>
        {(unpaid.length > 0 || unpaidAdmins.length > 0) && (
          <button
            onClick={() => { setAdjustment({ type: 'none', amount: '' }); setPayModal('all'); }}
            className="btn-primary flex items-center gap-2"
          >
            <CreditCard size={16} /> Pay All ({unpaid.length})
          </button>
        )}
      </div>

      {toast && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-neon-green border border-neon-green/20">{toast}</div>
      )}
      {accountNotice && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-yellow-300 border border-yellow-500/20">{accountNotice}</div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Unpaid */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white">Pending Payment</h2>
            <span className="badge-pending">{unpaid.length + unpaidAdmins.length}</span>
          </div>
          <div className="space-y-2">
            {unpaidAdmins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between py-3 border-b border-white/5 bg-purple-500/5 rounded-lg px-3">
                <div>
                  <p className="text-sm font-medium text-purple-400">{admin.fullName} (Admin)</p>
                  <p className="text-xs font-mono text-white/30">{admin.uniqueId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-mono text-purple-400">{fmt(admin.salary)}</p>
                  <button
                    onClick={() => { setAdjustment({ type: 'none', amount: '' }); setPayModal({ ...admin, type: 'admin' }); }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                  >
                    Pay
                  </button>
                </div>
              </div>
            ))}
            {unpaid.map(emp => (
              <div key={emp.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{emp.name}</p>
                  <p className="text-xs font-mono text-white/30">{emp.uniqueEmployeeId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-mono text-yellow-400">{fmt(emp.salary)}</p>
                  <button
                    onClick={() => { setAdjustment({ type: 'none', amount: '' }); setPayModal(emp); }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition-colors"
                  >
                    Pay
                  </button>
                </div>
              </div>
            ))}
            {unpaid.length === 0 && unpaidAdmins.length === 0 && <Empty icon={CheckCircle} title="All paid!" />}
          </div>
        </div>

        {/* Paid */}
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
                <div className="text-right">
                  <p className="text-sm font-mono text-neon-green">{fmt(emp.payment?.amount)}</p>
                  {emp.payment?.adjustment?.type !== 'none' && (
                    <p className="text-xs font-mono text-white/30">
                      {emp.payment.adjustment.type} {fmt(emp.payment.adjustment.amount)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {paid.length === 0 && <Empty icon={CreditCard} title="No payments yet" />}
          </div>
        </div>
      </div>

      {/* Pay One Modal */}
      <Modal isOpen={!!payModal && payModal !== 'all'} onClose={() => setPayModal(null)}
        title={`Pay ${payModal?.type === 'admin' ? payModal?.fullName : payModal?.name}`}>
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-white/50">Base Salary</p>
            <p className="font-display font-bold text-2xl text-neon-green">{fmt(payModal?.salary)}</p>
          </div>
          {payModal?.type !== 'admin' && (
            <>
              <div>
                <label className="label">Adjustment Type</label>
                <select
                  value={adjustment.type}
                  onChange={e => setAdjustment({ ...adjustment, type: e.target.value })}
                  className="input-field"
                >
                  <option value="none">No Adjustment</option>
                  <option value="raise">Raise</option>
                  <option value="deduct">Deduct</option>
                </select>
              </div>
              {adjustment.type !== 'none' && (
                <div>
                  <label className="label">Amount (₹)</label>
                  <input type="number" value={adjustment.amount}
                    onChange={e => setAdjustment({ ...adjustment, amount: e.target.value })}
                    className="input-field" placeholder="0" />
                </div>
              )}
            </>
          )}
          <div>
            <label className="label">Pay From Account</label>
            <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="input-field">
              {sourceAccounts.length === 0 && <option value="">No account available</option>}
              {sourceAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountLabel}
                </option>
              ))}
            </select>
          </div>
          <button onClick={payOne} disabled={paying}
            className="w-full btn-primary flex items-center justify-center gap-2">
            {paying && <Loader2 size={16} className="animate-spin" />}
            Confirm Payment
          </button>
        </div>
      </Modal>

      {/* Pay All Modal */}
      <Modal isOpen={payModal === 'all'} onClose={() => setPayModal(null)} title="Run Bulk Payroll">
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-white/50">Employees to Pay</p>
            <p className="font-display font-bold text-2xl text-neon-green">{unpaid.length}</p>
          </div>
          <div>
            <label className="label">Adjustment Type</label>
            <select value={adjustment.type}
              onChange={e => setAdjustment({ ...adjustment, type: e.target.value })}
              className="input-field">
              <option value="none">No Adjustment</option>
              <option value="raise">Raise for All</option>
              <option value="deduct">Deduct from All</option>
            </select>
          </div>
          {adjustment.type !== 'none' && (
            <div>
              <label className="label">Amount (₹)</label>
              <input type="number" value={adjustment.amount}
                onChange={e => setAdjustment({ ...adjustment, amount: e.target.value })}
                className="input-field" placeholder="0" />
            </div>
          )}
          <div>
            <label className="label">Pay From Account</label>
            <select value={sourceAccountId} onChange={e => setSourceAccountId(e.target.value)} className="input-field">
              {sourceAccounts.length === 0 && <option value="">No account available</option>}
              {sourceAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountLabel}
                </option>
              ))}
            </select>
          </div>
          {unpaidAdmins.length > 0 && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={includeAdmin} onChange={e => setIncludeAdmin(e.target.checked)}
                className="w-4 h-4 accent-neon-green" />
              <span className="text-sm text-white/70">Include all unpaid admins ({unpaidAdmins.length})</span>
            </label>
          )}
          <button onClick={payAll} disabled={paying}
            className="w-full btn-primary flex items-center justify-center gap-2">
            {paying && <Loader2 size={16} className="animate-spin" />}
            Run Payroll
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Org Settings ──────────────────────────────────────────────────────────────
export function OrgSettings() {
  const [org, setOrg] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState({ logoUrl: '', coverPhotoUrl: '', websiteTheme: '' });
  const [bank, setBank] = useState({ bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branch: '' });
  const [adminForm, setAdminForm] = useState({ fullName: '', uniqueId: '', email: '', password: '', salary: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const loadAdmins = async () => {
    const { data } = await api.orgAdmins();
    setAdmins(data.admins || []);
  };

  useEffect(() => {
    Promise.all([api.orgMe(), api.orgAdmins()]).then(([orgRes, adminsRes]) => {
      setOrg(orgRes.data.organization);
      setBranding(orgRes.data.organization.branding || {});
      setAdmins(adminsRes.data.admins || []);
    }).finally(() => setLoading(false));
  }, []);

  const saveBranding = async () => {
    setSaving(true);
    try {
      await api.orgUpdateBranding(branding);
      setToast('Branding updated!');
    } catch { setToast('Error saving'); }
    finally { setSaving(false); setTimeout(() => setToast(''), 3000); }
  };

  const addBank = async () => {
    setSaving(true);
    try {
      await api.orgAddBank(bank);
      setToast('Bank account added!');
      setBank({ bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branch: '' });
      api.orgMe().then(r => setOrg(r.data.organization));
    } catch (err) { setToast(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); setTimeout(() => setToast(''), 3000); }
  };

  const addAdmin = async () => {
    setSaving(true);
    try {
      await api.orgCreateAdmin({
        fullName: adminForm.fullName,
        uniqueId: adminForm.uniqueId,
        email: adminForm.email,
        password: adminForm.password,
        salary: Number(adminForm.salary) || 0
      });
      setToast('Admin created successfully');
      setAdminForm({ fullName: '', uniqueId: '', email: '', password: '', salary: '' });
      await loadAdmins();
    } catch (err) {
      setToast(err.response?.data?.error || 'Unable to create admin');
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 3000);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="text-neon-green w-8 h-8" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display font-extrabold text-3xl text-white">Organization Settings</h1>
        <p className="text-white/30 text-sm mt-1">{org?.name} · {org?.code}</p>
      </div>

      {toast && <div className="glass rounded-xl px-4 py-3 text-sm text-neon-green border border-neon-green/20">{toast}</div>}

      {/* Info */}
      <div className="glass rounded-2xl p-6 space-y-3">
        <h2 className="font-display font-bold text-white mb-4">Organization Info</h2>
        {[['Name', org?.name], ['Code', org?.code], ['Email', org?.email]].map(([l, v]) => (
          <div key={l} className="flex justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-sm text-white/40">{l}</span>
            <span className="text-sm font-mono text-white">{v}</span>
          </div>
        ))}
      </div>

      {/* Branding */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-bold text-white">Branding</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Logo URL</label>
            <input value={branding.logoUrl || ''} onChange={e => setBranding({ ...branding, logoUrl: e.target.value })} className="input-field" placeholder="https://..." />
          </div>
          <div>
            <label className="label">Cover Photo URL</label>
            <input value={branding.coverPhotoUrl || ''} onChange={e => setBranding({ ...branding, coverPhotoUrl: e.target.value })} className="input-field" placeholder="https://..." />
          </div>
          <div>
            <label className="label">Website Theme</label>
            <input value={branding.websiteTheme || ''} onChange={e => setBranding({ ...branding, websiteTheme: e.target.value })} className="input-field" placeholder="e.g. dark, minimal" />
          </div>
        </div>
        <button onClick={saveBranding} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />} Save Branding
        </button>
      </div>

      {/* Bank Accounts */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-bold text-white">Bank Accounts</h2>
        {(org?.bankAccounts || []).map((b, i) => (
          <div key={i} className="glass rounded-xl p-4">
            <p className="font-medium text-white">{b.bankName}</p>
            <p className="text-xs font-mono text-white/40">{b.accountNumber} · {b.ifscCode}</p>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
          {[['Bank Name', 'bankName', 'State Bank of India'], ['Account Holder', 'accountHolderName', 'Jane Smith'],
            ['Account Number', 'accountNumber', '0001234567'], ['IFSC Code', 'ifscCode', 'SBIN0001234'],
            ['Branch', 'branch', 'Main Branch']].map(([l, k, ph]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input value={bank[k]} onChange={e => setBank({ ...bank, [k]: e.target.value })}
                className="input-field" placeholder={ph} />
            </div>
          ))}
        </div>
        <button onClick={addBank} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />}
          <Plus size={14} /> Add Bank Account
        </button>
      </div>

      {/* Admin Management */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display font-bold text-white">Admins</h2>
        <p className="text-sm text-white/40">Add admins one-by-one. Organization can create multiple admins.</p>

        {(admins || []).length === 0 ? (
          <p className="text-sm text-white/35">No admins added yet.</p>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div key={admin.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{admin.fullName}</p>
                  <p className="text-xs font-mono text-white/35">{admin.uniqueId} · {admin.email}</p>
                </div>
                <p className="text-xs font-mono text-neon-green">₹{Number(admin.salary || 0).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
          {[['Full Name', 'fullName', 'Jane Doe'], ['Unique ID', 'uniqueId', 'ADMIN001'], ['Email', 'email', 'jane@company.com'], ['Password', 'password', 'Strong@123'], ['Salary (optional)', 'salary', '50000']].map(([l, k, ph]) => (
            <div key={k} className={k === 'salary' ? 'col-span-2 sm:col-span-1' : ''}>
              <label className="label">{l}</label>
              <input
                type={k === 'password' ? 'password' : (k === 'salary' ? 'number' : 'text')}
                value={adminForm[k]}
                onChange={e => setAdminForm({ ...adminForm, [k]: e.target.value })}
                className="input-field"
                placeholder={ph}
              />
            </div>
          ))}
        </div>
        <button onClick={addAdmin} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <Loader2 size={14} className="animate-spin" />}
          <Plus size={14} /> Add Admin
        </button>
      </div>
    </div>
  );
}

