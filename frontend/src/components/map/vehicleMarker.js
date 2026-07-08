import L from 'leaflet';

export function getBearing(from, to) {
  if (!from || !to) return 0;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLon = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Top-down lorry (cab + cargo box) — points up at 0° */
const TRUCK_AERIAL_SVG = `
  <svg class="bolt-truck-svg bolt-truck-svg--aerial" viewBox="0 0 32 52" aria-hidden="true">
    <path fill="#f59e0b" stroke="#1e293b" stroke-width="1.2" d="M10 4h12a2 2 0 012 2v8h6a2 2 0 012 2v22a2 2 0 01-2 2h-2.2a4 4 0 01-7.6 0h-8.4a4 4 0 01-7.6 0H8a2 2 0 01-2-2V6a2 2 0 012-2z"/>
    <path fill="#fef3c7" d="M12 6h8v8h-8V6z"/>
    <rect fill="#d97706" x="10" y="14" width="12" height="18" rx="1"/>
    <circle fill="#1e293b" cx="11" cy="44" r="3.2"/>
    <circle fill="#1e293b" cx="21" cy="44" r="3.2"/>
    <circle fill="#94a3b8" cx="11" cy="44" r="1.2"/>
    <circle fill="#94a3b8" cx="21" cy="44" r="1.2"/>
  </svg>
`;

/** Side-view lorry for street map */
const TRUCK_STREET_SVG = `
  <svg class="bolt-truck-svg bolt-truck-svg--street" viewBox="0 0 48 28" aria-hidden="true">
    <path fill="#f59e0b" stroke="#1e293b" stroke-width="1.2" d="M2 10h22v10H2V10zm22 2h8l6 6v4H24V12z"/>
    <rect fill="#d97706" x="4" y="12" width="16" height="6" rx="0.5"/>
    <path fill="#fef3c7" d="M26 14h6l4 4h-10v-4z"/>
    <circle fill="#1e293b" cx="10" cy="22" r="3"/>
    <circle fill="#1e293b" cx="34" cy="22" r="3"/>
    <circle fill="#94a3b8" cx="10" cy="22" r="1"/>
    <circle fill="#94a3b8" cx="34" cy="22" r="1"/>
  </svg>
`;

export function createVehicleIcon(heading = 0, isLive = false, aerial = false) {
  const rounded = Math.round(heading);
  const liveClass = isLive ? 'bolt-vehicle-wrap--live' : '';
  const aerialClass = aerial ? 'bolt-vehicle-wrap--aerial' : '';
  const truckSvg = aerial ? TRUCK_AERIAL_SVG : TRUCK_STREET_SVG;

  const size = aerial
    ? { w: 36, h: 52, ax: 18, ay: 26 }
    : { w: 48, h: 32, ax: 24, ay: 16 };

  return L.divIcon({
    className: 'bolt-driver-icon bolt-truck-icon',
    html: `
      <div class="bolt-vehicle-wrap bolt-truck-wrap ${liveClass} ${aerialClass}">
        <div class="bolt-truck-marker" style="transform: rotate(${rounded}deg)">
          ${truckSvg}
        </div>
      </div>
    `,
    iconSize: [size.w, size.h],
    iconAnchor: [size.ax, size.ay],
  });
}
