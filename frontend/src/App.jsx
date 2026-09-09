import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, lazy, Suspense } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { Spinner } from './components/UI';
import './index.css';

// eager: kecil & dipakai di luar auth
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// lazy: chunk besar (recharts, tabel) — ponytail: tambah lazy untuk semua route berat when chunk >500k lagi
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Pesawat = lazy(() => import('./pages/Pesawat'));
const TipePesawat = lazy(() => import('./pages/TipePesawat'));
const Pangkalan = lazy(() => import('./pages/Pangkalan'));
const MisiPenerbangan = lazy(() => import('./pages/MisiPenerbangan'));
const Users = lazy(() => import('./pages/Users'));
const Profile = lazy(() => import('./pages/Profile'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));

function isAdmin(user) {
  return ['Admin', 'Administrator'].includes(user?.role);
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label="Memuat halaman..." />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useUser();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useUser();
  if (loading) return <LoadingScreen />;
  return isAdmin(user) ? children : <Navigate to="/" replace />;
}

function PermissionRoute({ permission, children }) {
  const { user, loading } = useUser();
  if (loading) return <LoadingScreen />;
  if (isAdmin(user) || user?.permissions?.includes(permission)) return children;
  return <Navigate to="/" replace />;
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pesawat" element={<PermissionRoute permission="aircraft"><Pesawat /></PermissionRoute>} />
            <Route path="/tipe-pesawat" element={<PermissionRoute permission="aircraft"><TipePesawat /></PermissionRoute>} />
            <Route path="/pangkalan" element={<PermissionRoute permission="airbase"><Pangkalan /></PermissionRoute>} />
            <Route path="/misi-penerbangan" element={<PermissionRoute permission="missions"><MisiPenerbangan /></PermissionRoute>} />
            <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/audit-trail" element={<AdminRoute><AuditTrail /></AdminRoute>} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}
