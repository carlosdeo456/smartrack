/** Tanzania city coordinates for fleet tracking & seed data */
const TZ_REGIONS = {
  dar: { name: 'Dar es Salaam', code: 'DAR', lat: -6.7924, lng: 39.2083 },
  dod: { name: 'Dodoma', code: 'DOD', lat: -6.163, lng: 35.7516 },
  mwz: { name: 'Mwanza', code: 'MWZ', lat: -2.5164, lng: 32.9176 },
  aru: { name: 'Arusha', code: 'ARU', lat: -3.3869, lng: 36.683 },
  mby: { name: 'Mbeya', code: 'MBY', lat: -8.9094, lng: 33.4608 },
  mor: { name: 'Morogoro', code: 'MOR', lat: -6.8278, lng: 37.6591 },
  tng: { name: 'Tanga', code: 'TNG', lat: -5.0689, lng: 39.0988 },
  znz: { name: 'Zanzibar', code: 'ZNZ', lat: -6.1659, lng: 39.1989 }
};

const DEFAULT_CENTER = { lat: -6.778, lng: 39.245 }; // Mwenge, Dar es Salaam

/** Interpolate waypoints between region keys for GPS trails */
function trailBetween(...regionKeys) {
  const regions = regionKeys.map(k => TZ_REGIONS[k]);
  if (regions.length < 2) return regions.map(r => [r.lat, r.lng]);

  const points = [];
  const stepsPerLeg = 5;

  for (let i = 0; i < regions.length - 1; i++) {
    const a = regions[i];
    const b = regions[i + 1];
    const legSteps = i === regions.length - 2 ? stepsPerLeg : stepsPerLeg - 1;
    for (let s = 0; s <= legSteps; s++) {
      if (i > 0 && s === 0) continue;
      const t = s / legSteps;
      points.push([
        a.lat + (b.lat - a.lat) * t,
        a.lng + (b.lng - a.lng) * t
      ]);
    }
  }
  return points;
}

module.exports = { TZ_REGIONS, DEFAULT_CENTER, trailBetween };
