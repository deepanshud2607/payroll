import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Clock, CreditCard, Building2,
  LogOut, Menu, X, ChevronRight, Wallet, Bell, Settings
} from 'lucide-react';
import { useAuth } from '../lib/auth';

const navByRole = {
  organization: [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/org/dashboard' },
    { icon: Users, label: 'Employees', to: '/org/employees' },
    { icon: Clock, label: 'Approvals', to: '/org/approvals' },
    { icon: CreditCard, label: 'Payroll', to: '/org/payroll' },
    { icon: Building2, label: 'Organization', to: '/org/settings' },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
    { icon: Users, label: 'Employees', to: '/admin/employees' },
    { icon: Clock, label: 'Approvals', to: '/admin/approvals' },
    { icon: CreditCard, label: 'Payroll', to: '/admin/payroll' },
    { icon: Wallet, label: 'My Profile', to: '/admin/profile' },
  ],
  employee: [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/employee/dashboard' },
    { icon: Settings, label: 'Settings', to: '/employee/settings' },
  ],
};

export default function Shell({ children }) {
  const { auth, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const role = auth?.role;
  const user = auth?.user;
  const nav = navByRole[role] || [];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabel = { organization: 'Organization', admin: 'Admin', employee: 'Employee' }[role] || '';
  const roleColor = { organization: 'text-neon-blue', admin: 'text-neon-purple', employee: 'text-neon-green' }[role] || '';

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-green/20 border border-neon-green/30 flex items-center justify-center">
            <span className="font-display font-extrabold text-neon-green text-sm">P</span>
          </div>
          <div>
            <p className="font-display font-bold text-white text-lg leading-none">PayFlow</p>
            <p className={`text-[10px] font-mono uppercase tracking-widest mt-0.5 ${roleColor}`}>{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="glass rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-green/30 to-blue-500/20 flex items-center justify-center text-xs font-display font-bold text-neon-green">
            {(user?.name || user?.fullName || user?.orgName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display font-semibold text-white truncate">
              {user?.name || user?.fullName || user?.orgName || 'User'}
            </p>
            <p className="text-[10px] font-mono text-white/30 truncate">
              {user?.uniqueEmployeeId || user?.uniqueId || user?.email || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ icon: Icon, label, to }) => {
          const active = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                ${active
                  ? 'bg-neon-green/10 border border-neon-green/20 text-neon-green'
                  : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <Icon size={16} className={active ? 'text-neon-green' : ''} />
              <span className="font-body text-sm font-medium">{label}</span>
              {active && <ChevronRight size={12} className="ml-auto text-neon-green/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-white/30
          hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
        >
          <LogOut size={16} />
          <span className="font-body text-sm">Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050508] overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col glass border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-64 glass border-r border-white/5 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 lg:px-8 h-14 border-b border-white/5 flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
          >
            <Menu size={18} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white/60 transition-colors">
              <Bell size={16} />
            </button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-green/30 to-blue-500/20 flex items-center justify-center text-xs font-display font-bold text-neon-green">
              {(user?.name || user?.fullName || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

