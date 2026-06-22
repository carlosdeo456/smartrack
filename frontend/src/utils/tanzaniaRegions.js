/** Tanzania map defaults — keep in sync with backend/src/config/tanzaniaRegions.js */
export const TZ_DEFAULT_CENTER = { lat: -6.778, lng: 39.245 };

export const TZ_REGIONS = {
  dar: { name: 'Dar es Salaam', code: 'DAR', lat: -6.7924, lng: 39.2083 },
  dod: { name: 'Dodoma', code: 'DOD', lat: -6.163, lng: 35.7516 },
  mwz: { name: 'Mwanza', code: 'MWZ', lat: -2.5164, lng: 32.9176 },
  aru: { name: 'Arusha', code: 'ARU', lat: -3.3869, lng: 36.683 },
  mby: { name: 'Mbeya', code: 'MBY', lat: -8.9094, lng: 33.4608 },
  mor: { name: 'Morogoro', code: 'MOR', lat: -6.8278, lng: 37.6591 },
  tng: { name: 'Tanga', code: 'TNG', lat: -5.0689, lng: 39.0988 },
  znz: { name: 'Zanzibar', code: 'ZNZ', lat: -6.1659, lng: 39.1989 }
};

export function regionLabel(origin, destination) {
  const match = (text, regions) => {
    const lower = (text || '').toLowerCase();
    return Object.values(regions).find(r => lower.includes(r.name.toLowerCase()) || lower.includes(r.code.toLowerCase()));
  };
  const from = match(origin, TZ_REGIONS);
  const to = match(destination, TZ_REGIONS);
  if (from && to) return `${from.code} → ${to.code}`;
  return `${origin?.split(',')[0] || '?'} → ${destination?.split(',')[0] || '?'}`;
}
