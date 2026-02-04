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
  UserCheck,
  BarChart3
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import CheckinsList from './pages/CheckinsList';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import Login from './pages/Login';
import ShopsAnalytics from './pages/ShopsAnalytics';
import CustomersAnalytics from './pages/CustomersAnalytics';
import Insights from './pages/Insights';

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
    { path: '/insights', icon: BarChart3, label: 'Insights' },
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 glass-sidebar rounded-xl text-white shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 glass-sidebar text-white
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <img src="/logo.svg" alt="SalesSync" className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">SalesSync</h1>
            <p className="text-xs text-slate-400">Reports & Analytics</p>
          </div>
        </div>

        <div className="px-4 mb-6">
          <div className="search-bar">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none text-sm flex-1 text-white placeholder-slate-400"
            />
          </div>
        </div>

        <nav className="mt-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 mx-3 mb-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm"
          >
            <LogOut size={16} />
            <span>Sign out</span>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} apiUrl={API_URL} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 p-4 lg:p-8 pt-16 lg:pt-8 overflow-auto ml-0 lg:ml-0">
        <Routes>
                                        <Route path="/" element={<Dashboard apiUrl={API_URL} />} />
                                        <Route path="/insights" element={<Insights apiUrl={API_URL} />} />
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
