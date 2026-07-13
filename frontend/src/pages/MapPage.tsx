import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Phone, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBuses, useRoutes } from '../hooks';
import { Bus, Route, BusType, Gender } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToRoute, unsubscribeFromRoute } from '../services/socket';

function busIcon(type: BusType, occupancy: number) {
  const color = type === BusType.PINK ? '#ec4899' : '#059669';
  const occ = Math.min(Math.round(occupancy), 100);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 40 46">
    <circle cx="20" cy="20" r="18" fill="${color}" opacity="0.15"/>
    <circle cx="20" cy="20" r="13" fill="${color}"/>
    <text x="20" y="25" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="Inter,sans-serif">🚌</text>
    <text x="20" y="43" text-anchor="middle" fill="${color}" font-size="9" font-weight="bold" font-family="Inter,sans-serif">${occ}%</text>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [40, 46], iconAnchor: [20, 23] });
}

function stopIcon() {
  return L.divIcon({
    html: '<div style="width:10px;height:10px;border-radius:50%;background:#475569;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
    className: '', iconSize: [10, 10], iconAnchor: [5, 5],
  });
}

function SOSOverlay() {
  const HOLD_DURATION = 5000;
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'holding' | 'sent' | 'cancelled'>('idle');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef<number>(0);

  const cancelHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    setHolding(false);
    setProgress(0);
    if (status === 'holding') {
      setStatus('cancelled');
      setTimeout(() => setStatus('idle'), 1500);
    }
  }, [status]);

  const startHold = useCallback(() => {
    if (status === 'sent') return;
    setHolding(true);
    setStatus('holding');
    setProgress(0);
    startTime.current = Date.now();

    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const pct = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setProgress(pct);
    }, 50);

    holdTimer.current = setTimeout(() => {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setProgress(100);
      setHolding(false);
      setStatus('sent');
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation(null)
      );
    }, HOLD_DURATION);
  }, [status]);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  const circumference = 2 * Math.PI * 26;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <>
      <div className="absolute bottom-24 right-4 z-[500] flex flex-col items-center gap-1">
        {(status === 'idle' || status === 'cancelled') && (
          <p className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {status === 'cancelled' ? 'Released' : 'Hold 5s'}
          </p>
        )}
        <div
          className="relative flex items-center justify-center cursor-pointer select-none"
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={(e) => { e.preventDefault(); startHold(); }}
          onTouchEnd={cancelHold}
          onTouchCancel={cancelHold}
          style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          <svg width="64" height="64" className="absolute" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
            <circle cx="32" cy="32" r="26" fill="none"
              stroke={status === 'sent' ? '#22c55e' : '#ffffff'}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: holding ? 'none' : 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <motion.div
            animate={{ scale: holding ? 0.88 : 1 }}
            transition={{ duration: 0.1 }}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl ${status === 'sent' ? 'bg-green-500 shadow-green-400/60' : status === 'holding' ? 'bg-red-700 shadow-red-600/60' : 'bg-rose-600 shadow-rose-400/60'}`}
          >
            {status === 'sent' ? <Shield size={22} className="text-white" /> : <AlertTriangle size={22} className="text-white" />}
          </motion.div>
        </div>
        <p className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">SOS</p>
      </div>

      <AnimatePresence>
        {status === 'holding' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute inset-x-4 bottom-44 z-[500] rounded-2xl bg-rose-700/95 backdrop-blur-sm text-white px-5 py-4 shadow-2xl border border-rose-500/50">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0">
                <svg viewBox="0 0 48 48" className="w-12 h-12" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 - (progress / 100) * 2 * Math.PI * 20}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-black">
                  {Math.ceil((HOLD_DURATION - (progress / 100) * HOLD_DURATION) / 1000)}
                </div>
              </div>
              <div>
                <p className="font-black text-base">Sending SOS Alert</p>
                <p className="text-rose-200 text-xs mt-0.5">Keep holding • Release to cancel</p>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'cancelled' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute inset-x-4 bottom-44 z-[500] rounded-2xl bg-slate-800/90 backdrop-blur-sm text-white px-5 py-3 shadow-xl flex items-center gap-3">
            <X size={18} className="text-slate-400" />
            <p className="text-sm font-semibold">SOS cancelled — you are safe</p>
          </motion.div>
        )}

        {status === 'sent' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-x-4 bottom-44 z-[500] rounded-2xl bg-red-600/95 backdrop-blur-sm text-white px-5 py-4 shadow-2xl border border-red-400/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Phone size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-black text-base">🚨 Emergency Alert Sent!</p>
                <p className="text-red-100 text-xs mt-1">
                  {location ? `GPS: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Getting your location…'}
                </p>
                <p className="text-red-200 text-xs mt-1">Driver and emergency contacts notified.</p>
              </div>
              <button onClick={() => setStatus('idle')} className="text-white/60 hover:text-white mt-0.5">
                <X size={16} />
              </button>
            </div>
            <div className="mt-3 bg-black/20 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Phone size={14} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold">Calling Police — 15</p>
                <p className="text-red-200 text-[10px]">Emergency services alerted</p>
              </div>
              <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === 'holding' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[400] bg-red-900/30 pointer-events-none" />
        )}
      </AnimatePresence>
    </>
  );
}

function RouteSelector({ routes, selected, onSelect, canSeePink }: {
  routes: Route[]; selected: string | null; onSelect: (id: string | null) => void; canSeePink: boolean;
}) {
  const filtered = routes.filter((r: Route) => canSeePink || r.type !== BusType.PINK);
  return (
    <div className="absolute top-3 inset-x-3 z-[500]">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => onSelect(null)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${!selected ? 'bg-slate-900 text-white border-transparent' : 'bg-white/90 text-slate-700 border-slate-200 backdrop-blur-sm'}`}>
          All buses
        </button>
        {filtered.map((r: Route) => (
          <button key={r.id} onClick={() => onSelect(r.id === selected ? null : r.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${selected === r.id ? r.type === BusType.PINK ? 'bg-pink-500 text-white border-transparent' : 'bg-emerald-600 text-white border-transparent' : 'bg-white/90 text-slate-700 border-slate-200 backdrop-blur-sm'}`}>
            {r.id} · {r.name.split('(')[0].trim()}
          </button>
        ))}
      </div>
    </div>
  );
}

function FitBounds({ stops }: { stops: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (stops.length > 1) map.fitBounds(stops, { padding: [40, 40], maxZoom: 14 });
  }, [stops.map((s) => s.join(',')).join('|')]);
  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const { buses } = useBuses();
  const { data: routes = [] } = useRoutes();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const canSeePink = user?.gender === Gender.FEMALE || user?.role === 'admin';

  useEffect(() => {
    if (!selectedRoute) return;
    subscribeToRoute(selectedRoute);
    return () => unsubscribeFromRoute(selectedRoute);
  }, [selectedRoute]);

  const displayBuses = (selectedRoute ? buses.filter((b: Bus) => b.route_id === selectedRoute) : buses)
    .filter((b: Bus) => canSeePink || b.type !== BusType.PINK);

  const selectedRouteData = (routes as Route[]).find((r: Route) => r.id === selectedRoute);
  const routePolyline: [number, number][] = selectedRouteData?.stops?.map((s) => [s.latitude, s.longitude] as [number, number]) ?? [];

  return (
    <div className="relative h-full w-full">
      <RouteSelector routes={routes as Route[]} selected={selectedRoute} onSelect={setSelectedRoute} canSeePink={canSeePink} />
      <MapContainer center={[30.1884, 67.0100]} zoom={13} className="h-full w-full z-0" zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://openstreetmap.org">OSM</a>' />
        {routePolyline.length > 1 && (
          <>
            <FitBounds stops={routePolyline} />
            <Polyline positions={routePolyline} pathOptions={{ color: selectedRouteData?.type === BusType.PINK ? '#ec4899' : '#059669', weight: 4, opacity: 0.7 }} />
          </>
        )}
        {selectedRouteData?.stops?.map((s) => (
          <Marker key={s.stop_id ?? s.id} position={[s.latitude, s.longitude]} icon={stopIcon()}>
            <Popup><div className="text-sm font-semibold">{s.name}</div><div className="text-xs text-slate-500">Stop #{s.stop_order}</div></Popup>
          </Marker>
        ))}
        {displayBuses.map((bus: Bus) => {
          const occ = bus.capacity ? (bus.occupied_seats / bus.capacity) * 100 : 0;
          return (
            <Marker key={bus.id} position={[bus.latitude, bus.longitude]} icon={busIcon(bus.type, occ)}>
              <Popup>
                <div className="min-w-[160px] text-sm">
                  <p className="font-bold text-slate-900">{bus.id}</p>
                  <p className="text-slate-500 text-xs">{bus.route_name ?? bus.route_id}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                      <div className={`h-1.5 rounded-full ${occ > 80 ? 'bg-rose-500' : occ > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(occ, 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-600">{bus.occupied_seats}/{bus.capacity}</span>
                  </div>
                  <p className={`mt-1 text-xs font-semibold ${bus.type === BusType.PINK ? 'text-pink-600' : 'text-emerald-600'}`}>
                    {bus.type === BusType.PINK ? '🩷 Pink Bus (Women only)' : '🚌 Green Bus'}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <SOSOverlay />
    </div>
  );
}
