import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Map, Bus, Wallet, Share2, Shield, Star,
  Bell, Moon, Sun, LogOut, X, AlertTriangle, Info,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useAlerts } from './hooks';
import { UserRole, AlertType } from './types';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MapPage from './pages/MapPage';
import RoutesPage from './pages/RoutesPage';
import WalletPage from './pages/WalletPage';
import SharePage from './pages/SharePage';
import InfoPage from './pages/InfoPage';
import AdminPage from './pages/AdminPage';
import DriverPage from './pages/DriverPage';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────
function AlertBanner() {
  const alerts = useAlerts();
  const [idx, setIdx] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  useEffect(() => { if (idx >= visible.length) setIdx(0); }, [visible.length]);

  if (!visible.length) return null;
  const alert = visible[idx % visible.length];

  const colours: Record<string, string> = {
    disruption: 'bg-rose-600 text-white',
    delay: 'bg-amber-500 text-white',
    info: 'bg-emerald-600 text-white',
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={alert.id}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className={cn('flex items-center gap-3 px-4 py-2.5 text-sm', colours[alert.type] ?? colours.info)}
      >
        {alert.type === 'disruption' ? <AlertTriangle size={15} /> : <Info size={15} />}
        <span className="flex-1 font-medium truncate">{alert.message}</span>
        {visible.length > 1 && (
          <button onClick={() => setIdx((i) => i + 1)} className="opacity-70 hover:opacity-100 text-xs font-bold">
            {idx + 1}/{visible.length}
          </button>
        )}
        <button onClick={() => setDismissed((s) => new Set([...s, alert.id]))} className="opacity-70 hover:opacity-100">
          <X size={15} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ role }: { role: UserRole }) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs =
    role === UserRole.ADMIN
      ? [
          { path: '/',       icon: Map,    label: 'Map' },
          { path: '/routes', icon: Bus,    label: 'Routes' },
          { path: '/wallet', icon: Wallet, label: 'Wallet' },
          { path: '/admin',  icon: Shield, label: 'Admin' },
        ]
      : role === UserRole.DRIVER
      ? [
          { path: '/',       icon: Map,    label: 'Map' },
          { path: '/driver', icon: Bus,    label: 'My Bus' },
          { path: '/wallet', icon: Wallet, label: 'Wallet' },
        ]
      : [
          { path: '/',       icon: Map,    label: 'Map' },
          { path: '/routes', icon: Bus,    label: 'Routes' },
          { path: '/wallet', icon: Wallet, label: 'Wallet' },
          { path: '/share',  icon: Share2, label: 'Share' },
          { path: '/info',   icon: Star,   label: 'More' },
        ];

  return (
    <nav className="absolute bottom-4 inset-x-4 z-[600] flex items-center justify-around rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/85 dark:bg-slate-900/85 p-1.5 shadow-2xl backdrop-blur-xl">
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
           key={path}
            onClick={() => navigate(path)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 rounded-2xl transition-all',
              active
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                : 'text-slate-400 dark:text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400'
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Protected Layout ─────────────────────────────────────────────────────────
function AppShell() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Alert Banner */}
      <AlertBanner />

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 px-5 py-4 backdrop-blur-md border-b border-slate-100/50 dark:border-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-xl shadow-md shadow-emerald-100 dark:shadow-none">
            <Bus size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">
              Green Bus <span className="text-emerald-600 italic">PK</span>
            </h1>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Live</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark((d) => !d)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-400"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={logout}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-500 dark:text-slate-400"
          >
            <LogOut size={18} />
          </button>
          <img
            src={user.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.display_name)}`}
            alt="avatar"
            className="h-9 w-9 rounded-full border-2 border-white dark:border-slate-800 shadow-sm object-cover"
          />
        </div>
      </header>

      {/* Main */}
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="h-full"
          >
            <Routes location={location}>
              <Route path="/"       element={<MapPage />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/share"  element={<SharePage />} />
              <Route path="/info"   element={<InfoPage />} />
              <Route path="/admin"  element={user.role === UserRole.ADMIN ? <AdminPage /> : <Navigate to="/" />} />
              <Route path="/driver" element={user.role === UserRole.DRIVER ? <DriverPage /> : <Navigate to="/" />} />
              <Route path="*"       element={<Navigate to="/" />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav role={user.role} />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-emerald-50">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="bg-emerald-600 p-5 rounded-3xl shadow-xl shadow-emerald-200"
        >
          <Bus size={40} className="text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login"    element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
      <Route path="/*"        element={isAuthenticated ? <AppShell /> : <Navigate to="/login" />} />
    </Routes>
  );
}
