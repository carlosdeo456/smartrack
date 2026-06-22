const axios = require('axios');
const { TZ_REGIONS } = require('../config/tanzaniaRegions');

function matchRegion(text) {
  const lower = (text || '').toLowerCase();
  return Object.values(TZ_REGIONS).find(
    (r) => lower.includes(r.name.toLowerCase()) || lower.includes(r.code.toLowerCase())
  );
}

async function geocodeWithGoogle(address, apiKey) {
  const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: { address, key: apiKey },
    timeout: 12000,
  });
  const result = res.data?.results?.[0];
  if (!result?.geometry?.location) return null;
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
  };
}

async function geocodeWithNominatim(address) {
  const res = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: address, format: 'json', limit: 1, countrycodes: 'tz' },
    headers: { 'User-Agent': 'SmartTrack/1.0 (parcel-tracking)' },
    timeout: 12000,
  });
  const hit = res.data?.[0];
  if (!hit) return null;
  return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
}

/**
 * Resolve a location string to coordinates — region lookup, Google Maps, then OSM.
 */
async function geocodeLocation(address) {
  const trimmed = (address || '').trim();
  if (!trimmed) throw new Error('Address is required');

  const region = matchRegion(trimmed);
  if (region) {
    return { lat: region.lat, lng: region.lng, source: 'region' };
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey && !googleKey.includes('your-api-key')) {
    const google = await geocodeWithGoogle(trimmed, googleKey);
    if (google) return { ...google, source: 'google' };
  }

  const osm = await geocodeWithNominatim(trimmed);
  if (osm) return { ...osm, source: 'nominatim' };

  throw new Error(`Could not find map coordinates for "${trimmed}"`);
}

async function routeWithGoogle(from, to, apiKey) {
  const res = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
    params: {
      origin: `${from.lat},${from.lng}`,
      destination: `${to.lat},${to.lng}`,
      key: apiKey,
    },
    timeout: 15000,
  });
  const route = res.data?.routes?.[0];
  if (!route?.overview_polyline?.points) return null;

  return decodeGooglePolyline(route.overview_polyline.points).map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));
}

function decodeGooglePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

async function routeWithOsrm(from, to) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}`;
  const res = await axios.get(url, {
    params: { overview: 'full', geometries: 'geojson' },
    timeout: 15000,
  });
  const coords = res.data?.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) return null;
  return coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

/**
 * Road-following route between two points (Google Directions or OSRM).
 */
async function getPlannedRoute(from, to) {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey && !googleKey.includes('your-api-key')) {
    const googleRoute = await routeWithGoogle(from, to, googleKey);
    if (googleRoute?.length) return googleRoute;
  }

  const osrmRoute = await routeWithOsrm(from, to);
  if (osrmRoute?.length) return osrmRoute;

  return [
    { latitude: from.lat, longitude: from.lng },
    { latitude: to.lat, longitude: to.lng },
  ];
}

async function resolveShipmentRoute(originText, destinationText) {
  const origin = await geocodeLocation(originText);
  const destination = await geocodeLocation(destinationText);
  const plannedRoute = await getPlannedRoute(origin, destination);

  return {
    origin_latitude: origin.lat,
    origin_longitude: origin.lng,
    destination_latitude: destination.lat,
    destination_longitude: destination.lng,
    planned_route: plannedRoute,
  };
}

module.exports = {
  geocodeLocation,
  getPlannedRoute,
  resolveShipmentRoute,
};
