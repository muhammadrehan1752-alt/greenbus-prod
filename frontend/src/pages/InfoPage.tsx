import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Bell, Leaf, Camera, AlertTriangle, Info, Clock } from 'lucide-react';
import { useNews, useAlerts, useRoutes } from '../hooks';
import { useAuth } from '../contexts/AuthContext';
import { Route } from '../types';

const alertIcon: Record<string, React.ReactNode> = {
  disruption: <AlertTriangle size={15} />,
  delay: <Clock size={15} />,
  info: <Info size={15} />,
};
const alertColor: Record<string, string> = {
  disruption: 'border-l-rose-500 bg-rose-50 dark:bg-rose-950/20',
  delay: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20',
  info: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20',
};
const alertTextColor: Record<string, string> = {
  disruption: 'text-rose-700 dark:text-rose-400',
  delay: 'text-amber-700 dark:text-amber-400',
  info: 'text-emerald-700 dark:text-emerald-400',
};

export default function InfoPage() {
  const { user } = useAuth();
  const { data: news = [] } = useNews();
  const alerts = useAlerts();
  const { data: allRoutes = [] } = useRoutes();
  const [tab, setTab] = useState<'news' | 'alerts' | 'eco'>('news');

  const touristRoutes = allRoutes.filter((r: Route) => r.is_tourist);

  return (
    <div className="h-full overflow-y-auto pb-28 px-4 pt-4">
      <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">More</h2>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {([['news','News', Newspaper], ['alerts','Alerts', Bell], ['eco','Eco & Tourism', Leaf]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
              tab === key ? 'bg-emerald-600 text-white border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'news' && (
        <div className="space-y-3">
          {(news as any[]).map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50">
                  <Newspaper size={16} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.content}</p>
                  <p className="text-[10px] text-slate-400 mt-2">{new Date(n.created_at).toLocaleDateString('en-PK', { dateStyle: 'medium' })}</p>
                </div>
              </div>
            </motion.div>
          ))}
          {news.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">No news yet</p>}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-3">
          {(alerts as any[]).map((a) => (
            <div key={a.id} className={`rounded-2xl border-l-4 p-4 ${alertColor[a.type] ?? alertColor.info}`}>
              <div className={`flex items-center gap-2 font-bold text-sm mb-1 ${alertTextColor[a.type] ?? alertTextColor.info}`}>
                {alertIcon[a.type] ?? alertIcon.info}
                {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                {a.route_name && <span className="ml-auto text-xs font-semibold opacity-70">{a.route_name}</span>}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{a.message}</p>
              <p className="text-[10px] text-slate-400 mt-1">{new Date(a.created_at).toLocaleString()}</p>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <Bell size={36} className="mb-3 opacity-30" />
              <p className="text-sm font-semibold">No active alerts</p>
            </div>
          )}
        </div>
      )}

      {tab === 'eco' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-100 mb-3">Your eco impact</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-black">{user?.carbon_saved?.toFixed(1)}</p>
                <p className="text-xs text-emerald-200">kg CO₂ saved</p>
              </div>
              <div>
                <p className="text-3xl font-black">{user?.reward_points}</p>
                <p className="text-xs text-emerald-200">reward points</p>
              </div>
            </div>
            <p className="text-xs text-emerald-100 mt-3 opacity-80">Every bus ride saves ~2.1 kg CO₂ vs. private car</p>
          </div>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tourist routes</p>
          {touristRoutes.map((r: Route) => (
            <div key={r.id} className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50">
                  <Camera size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{r.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">PKR {r.fare} per person</p>
                </div>
              </div>
              {r.stops?.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-12">
                  {r.stops.map((s) => s.name).join(' → ')}
                </p>
              )}
            </div>
          ))}

          <div className="rounded-2xl border border-pink-200 dark:border-pink-900/50 bg-pink-50 dark:bg-pink-950/20 p-4">
            <p className="font-bold text-sm text-pink-700 dark:text-pink-400 mb-1">🩷 Pink Bus — Women's Safety Initiative</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Dedicated women-only buses with female conductors, monitored routes, and safe boarding zones.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
