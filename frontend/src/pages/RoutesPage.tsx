import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bus, MapPin, ChevronDown, ChevronUp, Heart, Ticket } from 'lucide-react';
import { useRoutes, useBuyTicket } from '../hooks';
import { Route, BusType, Gender } from '../types';
import { useAuth } from '../contexts/AuthContext';

function RouteCard({ route, canSeePink, onBuy }: { route: Route; canSeePink: boolean; onBuy: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const isPink = route.type === BusType.PINK;
  if (isPink && !canSeePink) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${isPink ? 'border-pink-200 bg-pink-50 dark:border-pink-900 dark:bg-pink-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isPink ? 'bg-pink-100 dark:bg-pink-900/50' : 'bg-emerald-50 dark:bg-emerald-950/50'}`}>
              {isPink ? <Heart size={18} className="text-pink-600" /> : <Bus size={18} className="text-emerald-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isPink ? 'bg-pink-200 text-pink-700' : 'bg-emerald-100 text-emerald-700'}`}>{route.id}</span>
                {route.is_tourist && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Tourist</span>}
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-sm mt-1">{route.name}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-black text-slate-900 dark:text-white">PKR {route.fare}</p>
            <p className="text-xs text-slate-400">per ride</p>
          </div>
        </div>
        {route.stops?.length > 0 && (
          <div className="mt-3 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <MapPin size={11} />
            <span className="truncate">{route.stops[0]?.name} → {route.stops[route.stops.length - 1]?.name}</span>
            <span className="ml-auto">{route.stops.length} stops</span>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <button onClick={() => setOpen(!open)}
            className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            {open ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> Stops</>}
          </button>
          <button onClick={() => onBuy(route.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold text-white active:scale-95 transition-all ${isPink ? 'bg-pink-500 hover:bg-pink-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            <Ticket size={14} /> Buy Ticket
          </button>
        </div>
      </div>
      {open && route.stops?.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-2">
          {route.stops.map((stop, i) => (
            <div key={stop.stop_id ?? stop.id ?? i} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full border-2 ${i === 0 ? 'bg-emerald-500 border-emerald-500' : i === route.stops.length - 1 ? 'bg-rose-500 border-rose-500' : 'bg-white border-slate-400 dark:bg-slate-900'}`} />
                {i < route.stops.length - 1 && <div className="w-0.5 h-4 bg-slate-200 dark:bg-slate-700" />}
              </div>
              <div className="flex items-center justify-between flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{stop.name}</p>
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">Stop {stop.stop_order ?? i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function RoutesPage() {
  const { user } = useAuth();
  const { data: routes = [], isLoading } = useRoutes();
  const buyTicket = useBuyTicket();
  const [filter, setFilter] = useState<'all' | 'green' | 'pink' | 'tourist'>('all');
  const [toast, setToast] = useState('');

  const canSeePink = user?.gender === Gender.FEMALE || user?.role === 'admin';

  async function handleBuy(routeId: string) {
    try {
      await buyTicket.mutateAsync(routeId);
      setToast('Ticket purchased! Check your wallet.');
    } catch (err: any) {
      setToast(err.response?.data?.error || 'Purchase failed');
    } finally {
      setTimeout(() => setToast(''), 3000);
    }
  }

  const filtered = (routes as Route[]).filter((r: Route) => {
    if (filter === 'green') return r.type === BusType.GREEN && !r.is_tourist;
    if (filter === 'pink') return r.type === BusType.PINK;
    if (filter === 'tourist') return r.is_tourist;
    return true;
  });

  return (
    <div className="h-full overflow-y-auto pb-28 px-4 pt-4">
      {toast && (
        <div className="fixed top-20 inset-x-4 z-50 rounded-2xl bg-emerald-600 text-white px-4 py-3 shadow-xl text-sm font-semibold text-center">{toast}</div>
      )}
      <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">Bus Routes</h2>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {(['all', 'green', ...(canSeePink ? ['pink'] : []), 'tourist'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f as typeof filter)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border capitalize transition-all ${filter === f ? f === 'pink' ? 'bg-pink-500 text-white border-transparent' : 'bg-emerald-600 text-white border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {f === 'all' ? 'All routes' : f === 'pink' ? '🩷 Pink Bus' : f === 'tourist' ? '📸 Tourist' : '🚌 Green Bus'}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((route: Route) => <RouteCard key={route.id} route={route} canSeePink={canSeePink} onBuy={handleBuy} />)}
          {filtered.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">No routes found</p>}
        </div>
      )}
    </div>
  );
}
