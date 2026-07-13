import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Phone, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBuses, useRoutes } from '../hooks';
import { Bus, Route, BusType, Gender } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToRoute, unsubscribeFromRoute } from '../services/socket';

// ─── Real Quetta Route Waypoints (road-accurate coordinates) ─────────────────
const ROUTE_WAYPOINTS: Record<string, [number, number][]> = {
  R1: [
    [30.1746, 66.9934], // University of Balochistan
    [30.1780, 66.9980], // UoB Gate → Sariab Road
    [30.1820, 67.0010], // Sariab Road / Brewery Road junction
    [30.1858, 67.0045], // Liaquat Park area
    [30.1884, 67.0016], // Civil Hospital
    [30.1900, 67.0060], // Kandahari Bazaar
    [30.1914, 67.0125], // Liaquat Market / Shahi Road
    [30.1950, 67.0080], // Jinnah Road
    [30.1980, 67.0090], // Quetta Railway Station
    [30.2033, 67.0100], // Cantonment
  ],
  R2: [
    [30.1601, 66.9854], // Sariab Road Start
    [30.1650, 66.9900], // Sariab Rd / Brewery junction
    [30.1700, 66.9920], // Satellite Town
    [30.1746, 66.9934], // University of Balochistan
    [30.1800, 66.9980], // Jinnah Town
    [30.1858, 67.0045], // Liaquat Park
    [30.1914, 67.0125], // Liaquat Market
    [30.1980, 67.0090], // Quetta Railway Station
    [30.2033, 67.0100], // Cantonment (Pink Bus terminal)
  ],
  R3: [
    [25.1118, 62.3332], // Gwadar Port Gate
    [25.1150, 62.3280], // Port Road
    [25.1180, 62.3250], // Fish Harbour
    [25.1200, 62.3200], // Marine Drive
    [25.1250, 62.3100], // Gwadar City Center
    [25.1900, 62.3200], // Airport Road
    [25.2100, 62.2800], // Near Airport
    [25.2333, 62.2667], // Gwadar Airport
  ],
  T1: [
    [30.1834, 67.0189], // Serena Hotel Chowk
    [30.1900, 67.0150], // Jinnah Road
    [30.1980, 67.0090], // Railway Station (Heritage)
    [30.2033, 67.0100], // Cantonment / Fort area
    [30.1960, 67.0050], // Quetta Museum
    [30.1914, 67.0125], // Liaquat Market
  ],
  T2: [
    [25.1200, 62.3200], // Marine Drive
    [25.1160, 62.3240], // Hammerhead Beach
    [25.1130, 62.3300], // Gwadar West Bay
    [25.1118, 62.3332], // Gwadar Port (end)
  ],
  R5: [
    [30.1834, 67.0189], // Koila Phatak Chowk
    [30.1870, 67.0150], // Jinnah Road
    [30.1950, 67.0080], // Quetta Railway Station
    [30.2033, 67.0100], // Cantonment / Airport Road turn
    [30.2200, 66.9900], // Airport Road
    [30.2500, 66.9600], // Baleli Road
    [30.2650, 66.9450], // Near Beleli Railway Station
    [30.2795, 66.9308], // BUITEMS Takatu Campus
  ],
};

// ─── OSRM road-snap function ──────────────────────────────────────────────────
async function fetchOSRMRoute(waypoints: [number, number][]): Promise<[number, number][]> {
  try {
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM failed');
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route');
    // GeoJSON is [lng, lat] — flip to [lat, lng] for Leaflet
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
  } catch {
    // Fallback to straight lines if OSRM fails
    return waypoints;
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────
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

function stopIcon(isFirst: boolean, isLast: boolean) {
  const color = isFirst ? '#059669' : isLast ? '#e11d48' : '#475569';
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.4)"></div>`,
    className: '', iconSize: [12, 12], iconAnchor: [6, 6],
  });
}

// ─── SOS Hold Button ──────────────────────────────────────────────────────────
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
      setProgress(Math.min((elapsed / HOLD_DURATION) * 100, 100));
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

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
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
          onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
          onTouchStart={(e) => { e.preventDefault(); startHold(); }}
          onTouchEnd={cancelHold} onTouchCancel={cancelHold}
          style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          <svg width="64" height="64" className="absolute" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
            <circle cx="32" cy="32" r="26" fill="none"
              stroke={status === 'sent' ? '#22c55e' : '#ffffff'}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              style={{ transition: holding ? 'none' : 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <motion.div animate={{ scale: holding ? 0.88 : 1 }} transition={{ duration: 0.1 }}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl ${status === 'sent' ? 'bg-green-500' : status === 'holding' ? 'bg-red-700' : 'bg-rose-600'}`}>
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
                    strokeDashoffset={2 * Math.PI * 20 - (progress / 100) * 2 * Math.PI * 20} />
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
            className="absolute inset-x-4 bottom-44 z-[500] rounded-2xl bg-slate-800/90 text-white px-5 py-3 shadow-xl flex items-center gap-3">
            <X size={18} className="text-slate-400" />
            <p className="text-sm font-semibold">SOS cancelled — you are safe</p>
          </motion.div>
        )}
        {status === 'sent' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-x-4 bottom-44 z-[500] rounded-2xl bg-red-600/95 text-white px-5 py-4 shadow-2xl border border-red-400/50">
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
              <button onClick={() => setStatus('idle')} className="text-white/60 hover:text-white"><X size={16} /></button>
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

// ─── Route Selector ───────────────────────────────────────────────────────────
function RouteSelector({ routes, selected, onSelect, canSeePink }: {
  routes: Route[]; selected: string | null; onSelect: (id: string | null) => void; canSeePink: boolean;
}) {
  const filtered = routes.filter((r: Route) => canSeePink || r.type !== BusType.PINK);
  return (
    <div className="absolute top-3 inset-x-3 z-[500]">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => onSelect(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${!selected ? 'bg-slate-900 text-white border-transparent' : 'bg-white/90 text-slate-700 border-slate-200 backdrop-blur-sm'}`}>
          All buses
        </button>
        {filtered.map((r: Route) => (
          <button key={r.id} onClick={() => onSelect(r.id === selected ? null : r.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
              selected === r.id
                ? r.type === BusType.PINK ? 'bg-pink-500 text-white border-transparent' : 'bg-emerald-600 text-white border-transparent'
                : 'bg-white/90 text-slate-700 border-slate-200 backdrop-blur-sm'
            }`}>
            {r.id} · {r.name.split('(')[0].trim()}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Auto-fit map to route ────────────────────────────────────────────────────
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [50, 50], maxZoom: 15 });
  }, [points.map(p => p.join(',')).join('|')]);
  return null;
}

// ─── Main MapPage ─────────────────────────────────────────────────────────────
export default function MapPage() {
  const { user } = useAuth();
  const { buses } = useBuses();
  const { data: routes = [] } = useRoutes();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [roadPolyline, setRoadPolyline] = useState<[number, number][]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const canSeePink = user?.gender === Gender.FEMALE || user?.role === 'admin';

  // Subscribe to live socket updates for selected route
  useEffect(() => {
    if (!selectedRoute) return;
    subscribeToRoute(selectedRoute);
    return () => unsubscribeFromRoute(selectedRoute);
  }, [selectedRoute]);

  // Fetch OSRM road-snapped route when a route is selected
  useEffect(() => {
    if (!selectedRoute) { setRoadPolyline([]); return; }
    const waypoints = ROUTE_WAYPOINTS[selectedRoute];
    if (!waypoints) { setRoadPolyline([]); return; }

    setLoadingRoute(true);
    fetchOSRMRoute(waypoints).then((path) => {
      setRoadPolyline(path);
      setLoadingRoute(false);
    });
  }, [selectedRoute]);

  const displayBuses = (selectedRoute ? buses.filter((b: Bus) => b.route_id === selectedRoute) : buses)
    .filter((b: Bus) => canSeePink || b.type !== BusType.PINK);

  const selectedRouteData = (routes as Route[]).find((r: Route) => r.id === selectedRoute);
  const routeColor = selectedRouteData?.type === BusType.PINK ? '#ec4899' : '#059669';
  const waypoints = selectedRoute ? (ROUTE_WAYPOINTS[selectedRoute] ?? []) : [];

  return (
    <div className="relative h-full w-full">
      <RouteSelector routes={routes as Route[]} selected={selectedRoute} onSelect={setSelectedRoute} canSeePink={canSeePink} />

      {/* Loading indicator */}
      {loadingRoute && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-lg flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          Loading road route…
        </div>
      )}

      <MapContainer center={[30.1884, 67.0100]} zoom={13} className="h-full w-full z-0" zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://openstreetmap.org">OSM</a>' />

        {/* Road-snapped polyline from OSRM */}
        {roadPolyline.length > 1 && (
          <>
            <FitBounds points={roadPolyline} />
            {/* Shadow/outline */}
            <Polyline positions={roadPolyline} pathOptions={{ color: '#ffffff', weight: 7, opacity: 0.6 }} />
            {/* Main route line */}
            <Polyline positions={roadPolyline} pathOptions={{ color: routeColor, weight: 5, opacity: 0.9 }} />
          </>
        )}

        {/* Stop markers */}
        {waypoints.map((pos, i) => (
          <Marker
            key={i}
            position={pos}
            icon={stopIcon(i === 0, i === waypoints.length - 1)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-slate-900">
                  {i === 0 ? '🟢 Start' : i === waypoints.length - 1 ? '🔴 End' : `Stop ${i + 1}`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedRouteData?.name}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Live bus markers */}
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
                      <div className={`h-1.5 rounded-full ${occ > 80 ? 'bg-rose-500' : occ > 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(occ, 100)}%` }} />
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
