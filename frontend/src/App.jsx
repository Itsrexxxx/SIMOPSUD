import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Pesawat from './pages/Pesawat';
import Pangkalan from './pages/Pangkalan';
import Skenario from './pages/Skenario';
import Simulasi from './pages/Simulasi';
import Laporan from './pages/Laporan';
import Login from './pages/Login';
import Register from './pages/Register';
import './index.css';

function MainLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pesawat" element={<Pesawat />} />
          <Route path="/pangkalan" element={<Pangkalan />} />
          <Route path="/skenario" element={<Skenario />} />
          <Route path="/simulasi" element={<Simulasi />} />
          <Route path="/laporan" element={<Laporan />} />
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
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}
