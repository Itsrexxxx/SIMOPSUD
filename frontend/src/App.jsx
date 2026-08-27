import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Pesawat from './pages/Pesawat';
import Pangkalan from './pages/Pangkalan';
import Skenario from './pages/Skenario';
import Simulasi from './pages/Simulasi';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Users from './pages/Users';
import Profile from './pages/Profile';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useUser();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useUser();
  if (loading) return null;
  return ['Admin', 'Administrator'].includes(user?.role) ? children : <Navigate to="/" replace />;
}

function PermissionRoute({ permission, children }) {
  const { user, loading } = useUser();
  if (loading) return null;
  if (['Admin', 'Administrator'].includes(user?.role) || user?.permissions?.includes(permission)) return children;
  return <Navigate to="/" replace />;
}

function MainLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pesawat" element={<PermissionRoute permission="aircraft"><Pesawat /></PermissionRoute>} />
          <Route path="/pangkalan" element={<PermissionRoute permission="airbase"><Pangkalan /></PermissionRoute>} />
          <Route path="/skenario" element={<PermissionRoute permission="scenarios"><Skenario /></PermissionRoute>} />
          <Route path="/simulasi" element={<PermissionRoute permission="ai"><Simulasi /></PermissionRoute>} />
          <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}
