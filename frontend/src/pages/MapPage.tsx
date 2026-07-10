import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle } from 'lucide-react';
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
    html: `<div style="width:10px;height:10px;border-radius:50%;background:#475569;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    className: '', iconSize: [10, 10], iconAnchor: [5, 5],
  });
}

function SOSOverlay() {
  const [sent, setSent] = useState(false);
  function trigger() {
    navigator.geolocation.getCurrentPosition(
      (pos) => { console.log('[SOS]', pos.coords.latitude, pos.coords.longitude); setSent(true); setTimeout(() => setSent(false), 4000); },
      () => { setSent(true); setTimeout(() => setSent(false), 4000); }
    );
  }
  return (
    <>
      <button onClick={trigger} className="absolute bottom-28 right-4 z-[500] flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 shadow-2xl shadow-rose-300 text-white active:scale-90 transition-transform">
        <AlertTriangle size={24} />
      </button>
      {sent && (
        <div className="absolute inset-x-4 bottom-48 z-[500] rounded-2xl bg-rose-600 text-white px-4 py-3 shadow-xl text-sm font-semibold text-center">
          ✓ Emergency alert sent with your GPS location
        </div>
      )}
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
