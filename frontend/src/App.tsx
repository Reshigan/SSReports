import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Users, 
  FileText, 
  LogOut,
  Menu,
  X,
  Store,
  UserCheck
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import CheckinsList from './pages/CheckinsList';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import Login from './pages/Login';
import ShopsAnalytics from './pages/ShopsAnalytics';
import CustomersAnalytics from './pages/CustomersAnalytics';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

function Sidebar({ user, onLogout }: { user: User; onLogout: () => void }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

    const navItems = [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/shops', icon: Store, label: 'Shops' },
      { path: '/customers', icon: UserCheck, label: 'Customers' },
      { path: '/map', icon: Map, label: 'Map View' },
      { path: '/checkins', icon: FileText, label: 'Checkins' },
      { path: '/reports', icon: FileText, label: 'Reports' },
      { path: '/users', icon: Users, label: 'Users' },
    ];

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-slate-900 text-white
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-emerald-400">SSReports</h1>
          <p className="text-sm text-slate-400 mt-1">SalesSync Analytics</p>
        </div>

        <nav className="mt-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-6 py-3 transition-colors
                  ${isActive 
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-slate-400">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} apiUrl={API_URL} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 overflow-auto">
        <Routes>
                    <Route path="/" element={<Dashboard apiUrl={API_URL} />} />
                    <Route path="/shops" element={<ShopsAnalytics apiUrl={API_URL} />} />
                    <Route path="/customers" element={<CustomersAnalytics apiUrl={API_URL} />} />
                    <Route path="/map" element={<MapView apiUrl={API_URL} />} />
                    <Route path="/checkins" element={<CheckinsList apiUrl={API_URL} />} />
                    <Route path="/reports" element={<Reports apiUrl={API_URL} />} />
                    <Route path="/users" element={<UserManagement apiUrl={API_URL} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
