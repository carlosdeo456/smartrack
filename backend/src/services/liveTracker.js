const pool = require('../config/database');
const { getLocationHistory, saveLocation } = require('./gpsService');

const trackers = new Map();
const TICK_MS = 4000;

function advancePosition(shipmentId, history) {
  if (history.length < 2) return null;

  const last = history[history.length - 1];

  if (!trackers.has(shipmentId)) {
    trackers.set(shipmentId, {
      waypointIndex: Math.max(0, history.length - 2),
      lat: last.latitude,
      lng: last.longitude
    });
  }

  const state = trackers.get(shipmentId);

  // Reset cached position when GPS trail changes (e.g. Tanzania migration)
  const drift = Math.hypot(last.latitude - state.lat, last.longitude - state.lng);
  if (drift > 0.15) {
    trackers.set(shipmentId, {
      waypointIndex: Math.max(0, history.length - 2),
      lat: last.latitude,
      lng: last.longitude
    });
  }

  const current = trackers.get(shipmentId);
  const targetIndex = Math.min(current.waypointIndex + 1, history.length - 1);
  const target = history[targetIndex];

  const step = 0.12;
  current.lat += (target.latitude - current.lat) * step;
  current.lng += (target.longitude - current.lng) * step;

  const dist = Math.hypot(target.latitude - current.lat, target.longitude - current.lng);
  if (dist < 0.02 && current.waypointIndex < history.length - 1) {
    current.waypointIndex = targetIndex;
  }

  return { latitude: current.lat, longitude: current.lng, speed: 45, accuracy: 15 };
}

async function tick(io) {
  try {
    const result = await pool.query(
      `SELECT id FROM shipments WHERE status = 'in_transit'`
    );

    for (const row of result.rows) {
      const history = await getLocationHistory(row.id);
      const next = advancePosition(row.id, history);
      if (!next) continue;

      const location = await saveLocation(row.id, next);
      const payload = {
        shipmentId: row.id,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        recordedAt: location.recordedAt
      };

      if (io) {
        io.emit('location-change', payload);
      }
    }
  } catch (err) {
    console.error('Live tracker tick failed:', err.message);
  }
}

function startLiveTracker(io) {
  console.log('📍 Live GPS tracker started (in_transit shipments)');
  setInterval(() => tick(io), TICK_MS);
}

module.exports = { startLiveTracker };
