import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, User, ArrowRight, Zap } from 'lucide-react';

const roles = [
  {
    icon: Building2,
    label: 'Organization',
    desc: 'Manage your company, employees, and run payroll',
    color: 'from-blue-500/20 to-cyan-500/10',
    border: 'border-blue-500/20 hover:border-blue-400/40',
    glow: 'hover:shadow-blue-500/10',
    textColor: 'text-blue-400',
    path: '/org/login',
  },
  {
    icon: ShieldCheck,
    label: 'Admin',
    desc: 'Oversee employee management and payments within your org',
    color: 'from-purple-500/20 to-pink-500/10',
    border: 'border-purple-500/20 hover:border-purple-400/40',
    glow: 'hover:shadow-purple-500/10',
    textColor: 'text-purple-400',
    path: '/admin/login',
  },
  {
    icon: User,
    label: 'Employee',
    desc: 'View your profile, salary status, and payment history',
    color: 'from-neon-green/20 to-teal-500/10',
    border: 'border-neon-green/20 hover:border-neon-green/40',
    glow: 'hover:shadow-neon-green/10',
    textColor: 'text-neon-green',
    path: '/employee/login',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050508] grid-bg flex flex-col items-center justify-center p-4">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-neon-green/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/3 blur-3xl" />
      </div>

      <div className="relative w-full max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-neon-green/20 border border-neon-green/30 flex items-center justify-center">
              <Zap size={20} className="text-neon-green" />
            </div>
          </div>
          <h1 className="font-display font-extrabold text-5xl text-white mb-3">
            Pay<span className="text-neon-green">Flow</span>
          </h1>
          <p className="font-body text-white/40 text-lg max-w-sm mx-auto">
            Streamlined employee payment processing for modern organizations
          </p>
        </motion.div>

        {/* Role cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {roles.map(({ icon: Icon, label, desc, color, border, textColor, path }, i) => (
            <motion.button
              key={label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, type: 'spring' }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(path)}
              className={`relative glass rounded-2xl p-6 text-left border transition-all duration-300
                hover:shadow-2xl cursor-pointer group ${border}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} border ${border.split(' ')[0]}
                flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                <Icon size={22} className={textColor} />
              </div>
              <h3 className={`font-display font-bold text-lg ${textColor} mb-1`}>{label}</h3>
              <p className="font-body text-sm text-white/40 leading-relaxed">{desc}</p>
              <div className={`flex items-center gap-1.5 mt-4 ${textColor} text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity`}>
                Sign in <ArrowRight size={12} />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Register link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 space-y-2"
        >
          <p className="text-sm text-white/30">
            New organization?{' '}
            <button
              onClick={() => navigate('/org/signup')}
              className="text-neon-green hover:text-neon-green/80 font-semibold transition-colors"
            >
              Register here
            </button>
          </p>
          <p className="text-sm text-white/30">
            New employee?{' '}
            <button
              onClick={() => navigate('/employee/signup')}
              className="text-neon-green hover:text-neon-green/80 font-semibold transition-colors"
            >
              Create account
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

