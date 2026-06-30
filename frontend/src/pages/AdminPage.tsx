import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bus, Users, Ticket, TrendingUp, Bell, Plus, X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useBuses, useBusStats, useAnalytics, useAlerts } from '../hooks';
import { alertApi, newsApi } from '../services/api';
import { BusStatus } from '../types';
import { useQueryClient } from '@tanstack/react-query';

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function CreateAlertModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState('info');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!message.trim()) return;
    setLoading(true);
    await alertApi.create({ type, message });
    qc.invalidateQueries({ queryKey: ['alerts'] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[800] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 pb-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <p className="font-black text-slate-900 dark:text-white text-lg">New Alert</p>
          <button onClick={onClose} className="rounded-full bg-slate-100 dark:bg-slate-800 p-2"><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="space-y-3">
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="info">ℹ️ Info</option>
            <option value="delay">⏱ Delay</option>
            <option value="disruption">🚨 Disruption</option>
          </select>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Alert message…"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          <button onClick={submit} disabled={!message.trim() || loading}
            className="w-full rounded-xl bg-rose-600 py-3 text-sm font-bold text-white disabled:opacity-50 active:scale-95 transition-all">
            {loading ? 'Broadcasting…' : 'Broadcast Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { buses } = useBuses();
  const { data: stats } = useBusStats();
  const { data: analytics } = useAnalytics();
  const alerts = useAlerts();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'fleet' | 'alerts'>('overview');
  const [showAlertModal, setShowAlertModal] = useState(false);

  const activeBuses = buses.filter((b) => b.status === BusStatus.ACTIVE).length;
  const totalPassengers = buses.reduce((s, b) => s + b.occupied_seats, 0);

  async function deactivateAlert(id: string) {
    await alertApi.deactivate(id);
    qc.invalidateQueries({ queryKey: ['alerts'] });
  }

  return (
    <div className="h-full overflow-y-auto pb-28 px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Admin Dashboard</h2>
        <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full">
          LIVE
        </span>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {(['overview','fleet','alerts'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border capitalize transition-all ${
              tab === t ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Bus} label="Active buses" value={activeBuses} color="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" />
            <StatCard icon={Users} label="Passengers now" value={totalPassengers} color="bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400" />
            <StatCard icon={Ticket} label="Today's tickets" value={analytics?.tickets?.today ?? '—'} color="bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400" />
            <StatCard icon={TrendingUp} label="Total revenue" value={`₨${analytics?.tickets?.total_revenue?.toFixed(0) ?? '—'}`} color="bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Occupancy overview */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <p className="font-bold text-sm text-slate-900 dark:text-white mb-3">Fleet occupancy</p>
            {buses.filter((b) => b.status === 'active').map((b) => {
              const pct = b.capacity ? Math.round((b.occupied_seats / b.capacity) * 100) : 0;
              return (
                <div key={b.id} className="mb-2.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{b.id}</span>
                    <span className="text-slate-400">{b.occupied_seats}/{b.capacity} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-1.5 rounded-full transition-all ${pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats summary */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <p className="font-bold text-sm text-slate-900 dark:text-white mb-3">7-day summary</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xl font-black text-slate-900 dark:text-white">{analytics?.tickets?.used ?? '—'}</p>
                <p className="text-xs text-slate-400">Total rides</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xl font-black text-slate-900 dark:text-white">{analytics?.feedback?.avg_rating ?? '—'}</p>
                <p className="text-xs text-slate-400">Avg rating ★</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xl font-black text-slate-900 dark:text-white">{analytics?.users?.total ?? '—'}</p>
                <p className="text-xs text-slate-400">Registered users</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-xl font-black text-slate-900 dark:text-white">{analytics?.users?.new_this_week ?? '—'}</p>
                <p className="text-xs text-slate-400">New this week</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'fleet' && (
        <div className="space-y-3">
          {buses.map((b) => {
            const occ = b.capacity ? Math.round((b.occupied_seats / b.capacity) * 100) : 0;
            const statusColors: Record<string, string> = {
              active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
              maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
              inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
            };
            return (
              <div key={b.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${b.type === 'pink' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'}`}>{b.id}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{b.route_name ?? b.route_id}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[b.status]}`}>{b.status}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{b.driver_name ?? 'No driver'}</span>
                  <span>·</span>
                  <span>{b.occupied_seats}/{b.capacity} seats</span>
                  <span>·</span>
                  <span>GPS: {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-1.5 rounded-full ${occ > 80 ? 'bg-rose-500' : occ > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${occ}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-3">
          <button
            onClick={() => setShowAlertModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 py-4 text-sm font-bold text-slate-500 dark:text-slate-400 hover:border-rose-400 hover:text-rose-500 transition-colors"
          >
            <Plus size={18} /> Broadcast new alert
          </button>

          {alerts.map((a: any) => (
            <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className={`p-2 rounded-xl mt-0.5 ${a.type === 'disruption' ? 'bg-rose-50 dark:bg-rose-950/30' : a.type === 'delay' ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
                {a.type === 'disruption' ? <AlertTriangle size={15} className="text-rose-600" /> :
                 a.type === 'delay' ? <Bus size={15} className="text-amber-600" /> :
                 <Info size={15} className="text-emerald-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{a.message}</p>
                {a.route_name && <p className="text-xs text-slate-400 mt-0.5">Route: {a.route_name}</p>}
                <p className="text-[10px] text-slate-400 mt-1">{new Date(a.created_at).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
              <button onClick={() => deactivateAlert(a.id)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          ))}
          {alerts.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">No active alerts</p>}
        </div>
      )}

      {showAlertModal && <CreateAlertModal onClose={() => setShowAlertModal(false)} />}
    </div>
  );
}
