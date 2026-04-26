import { motion } from 'framer-motion';
import { Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useState } from 'react';

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: '50%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl glass
        ${type === 'success' ? 'border-neon-green/30 text-neon-green' : 'border-red-500/30 text-red-400'}`}
      style={{ transform: 'none' }}
    >
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      <span className="font-body text-sm text-white">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/40 hover:text-white">
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative glass rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ border: '1px solid rgba(0,255,163,0.1)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-bold text-lg text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, color = 'green', delay = 0 }) {
  const colors = {
    green: 'text-neon-green border-neon-green/20 bg-neon-green/5',
    blue: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
    yellow: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5',
    red: 'text-red-400 border-red-500/20 bg-red-500/5',
    purple: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`glass rounded-2xl p-5 card-hover ${colors[color]}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-display uppercase tracking-widest text-white/40 mb-2">{label}</p>
          <p className={`text-3xl font-display font-extrabold ${colors[color].split(' ')[0]}`}>{value}</p>
          {sub && <p className="text-xs text-white/30 mt-1 font-mono">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${colors[color].split(' ')[2]} border ${colors[color].split(' ')[1]}`}>
            <Icon size={20} className={colors[color].split(' ')[0]} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function Empty({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="p-4 rounded-2xl glass mb-4">
          <Icon size={32} className="text-white/20" />
        </div>
      )}
      <p className="font-display font-semibold text-white/40 text-lg">{title}</p>
      {sub && <p className="text-sm text-white/20 mt-1">{sub}</p>}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Field({ label, error, children }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

