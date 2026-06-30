import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Navigation, Users, Wifi, WifiOff, CheckCircle2, XCircle, Camera, Minus, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { busApi, ticketApi } from '../services/api';
import { sendDriverLocation } from '../services/socket';

interface ScanResult { success: boolean; message: string; }

export default function DriverPage() {
  const { user } = useAuth();
  const busId = user?.assigned_bus_id;
  const [gpsActive, setGpsActive] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [occupied, setOccupied] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [ticketId, setTicketId] = useState('');
  const [validating, setValidating] = useState(false);
  const watchRef = useRef<number | null>(null);
  const sendInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start GPS tracking
  function startTracking() {
    if (!busId || !navigator.geolocation) return;
    setGpsActive(true);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        // Emit via Socket.io
        sendDriverLocation(busId, latitude, longitude, occupied);
      },
      (err) => { console.error('[GPS]', err); setGpsActive(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    // Also push via REST every 30s as fallback
    sendInterval.current = setInterval(async () => {
      if (coords) {
        await busApi.updateLocation({ bus_id: busId, latitude: coords.lat, longitude: coords.lng, occupied_seats: occupied });
      }
    }, 30000);
  }

  function stopTracking() {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    if (sendInterval.current) clearInterval(sendInterval.current);
    setGpsActive(false);
    if (busId) busApi.updateStatus(busId, 'inactive');
  }

  useEffect(() => () => stopTracking(), []);

  // Update occupancy in DB when changed
  async function updateOccupancy(delta: number) {
    const next = Math.max(0, occupied + delta);
    setOccupied(next);
    if (busId && coords) {
      sendDriverLocation(busId, coords.lat, coords.lng, next);
    }
  }

  async function validateTicket() {
    if (!ticketId.trim()) return;
    setValidating(true);
    try {
      await ticketApi.validate(ticketId.trim(), busId);
      setScanResult({ success: true, message: '✓ Ticket valid — passenger boarded' });
      setTicketId('');
      updateOccupancy(1);
    } catch (err: any) {
      setScanResult({ success: false, message: err.response?.data?.error || 'Invalid ticket' });
    } finally {
      setValidating(false);
      setTimeout(() => setScanResult(null), 3000);
    }
  }

  if (!busId) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <Navigation size={48} className="text-slate-300 mb-4" />
        <p className="font-bold text-slate-900 dark:text-white">No bus assigned</p>
        <p className="text-sm text-slate-400 mt-1">Contact admin to assign you to a bus</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-28 px-4 pt-4">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">My Bus</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{busId}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${gpsActive ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
          {gpsActive ? <Wifi size={13} /> : <WifiOff size={13} />}
          {gpsActive ? 'GPS Live' : 'GPS Off'}
        </div>
      </div>

      {/* GPS control */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Location tracking</p>
        {coords && (
          <p className="text-xs text-slate-400 mb-3 font-mono">
            {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </p>
        )}
        <button
          onClick={gpsActive ? stopTracking : startTracking}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black transition-all active:scale-95 ${
            gpsActive
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none'
              : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
          }`}
        >
          <Navigation size={18} />
          {gpsActive ? 'Stop broadcasting location' : 'Start broadcasting location'}
        </button>
        {!gpsActive && (
          <p className="text-xs text-slate-400 text-center mt-2">Tap to start — passengers will see your bus on the map</p>
        )}
      </div>

      {/* Occupancy control */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Passenger count</p>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => updateOccupancy(-1)}
            disabled={occupied === 0}
            className="w-14 h-14 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:border-rose-400 hover:text-rose-500 transition-all active:scale-90"
          >
            <Minus size={22} />
          </button>
          <div className="text-center">
            <p className="text-5xl font-black text-slate-900 dark:text-white">{occupied}</p>
            <p className="text-xs text-slate-400 mt-1">on board</p>
          </div>
          <button
            onClick={() => updateOccupancy(1)}
            className="w-14 h-14 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:border-emerald-500 hover:text-emerald-600 transition-all active:scale-90"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Ticket validation */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Validate ticket</p>
        <p className="text-xs text-slate-400 mb-3">Enter ticket ID or scan QR code</p>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && validateTicket()}
            placeholder="Ticket UUID…"
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          />
          <button
            onClick={validateTicket}
            disabled={!ticketId.trim() || validating}
            className="rounded-xl bg-emerald-600 px-4 text-white disabled:opacity-50 font-bold text-sm active:scale-95 transition-all"
          >
            {validating ? '…' : 'Check'}
          </button>
        </div>

        {scanResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-2 rounded-xl p-3 text-sm font-semibold ${
              scanResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
            }`}
          >
            {scanResult.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {scanResult.message}
          </motion.div>
        )}
      </div>
    </div>
  );
}
