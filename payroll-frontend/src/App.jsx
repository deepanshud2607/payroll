import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Shell from './components/Shell';

import LandingPage from './pages/Landing';
import { OrgLogin, OrgSignup, AdminLogin, EmpLogin, EmpSignup } from './pages/Auth';
import { OrgDashboard, OrgEmployees, OrgApprovals, OrgPayroll, OrgSettings } from './pages/OrgPages';
import { AdminDashboard, AdminEmployees, AdminApprovals, AdminPayroll, AdminProfile } from './pages/AdminPages';
import { EmpDashboard, EmpSettings } from './pages/EmpPages';

function Protected({ role, children }) {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/" replace />;
  if (role && auth.role !== role) return <Navigate to="/" replace />;
  return <Shell>{children}</Shell>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* Auth */}
          <Route path="/org/login" element={<OrgLogin />} />
          <Route path="/org/signup" element={<OrgSignup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/employee/login" element={<EmpLogin />} />
          <Route path="/employee/signup" element={<EmpSignup />} />

          {/* Organization */}
          <Route path="/org/dashboard" element={<Protected role="organization"><OrgDashboard /></Protected>} />
          <Route path="/org/employees" element={<Protected role="organization"><OrgEmployees /></Protected>} />
          <Route path="/org/approvals" element={<Protected role="organization"><OrgApprovals /></Protected>} />
          <Route path="/org/payroll" element={<Protected role="organization"><OrgPayroll /></Protected>} />
          <Route path="/org/settings" element={<Protected role="organization"><OrgSettings /></Protected>} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<Protected role="admin"><AdminDashboard /></Protected>} />
          <Route path="/admin/employees" element={<Protected role="admin"><AdminEmployees /></Protected>} />
          <Route path="/admin/approvals" element={<Protected role="admin"><AdminApprovals /></Protected>} />
          <Route path="/admin/payroll" element={<Protected role="admin"><AdminPayroll /></Protected>} />
          <Route path="/admin/profile" element={<Protected role="admin"><AdminProfile /></Protected>} />

          {/* Employee */}
          <Route path="/employee/dashboard" element={<Protected role="employee"><EmpDashboard /></Protected>} />
          <Route path="/employee/settings" element={<Protected role="employee"><EmpSettings /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

