const pool = require('../config/database');

function formatLocation(row) {
  return {
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    altitude: row.altitude != null ? parseFloat(row.altitude) : null,
    accuracy: row.accuracy != null ? parseFloat(row.accuracy) : null,
    speed: row.speed != null ? parseFloat(row.speed) : null,
    recordedAt: row.recorded_at
  };
}

async function saveLocation(shipmentId, { latitude, longitude, altitude, accuracy, speed }) {
  const result = await pool.query(
    `INSERT INTO gps_locations (shipment_id, latitude, longitude, altitude, accuracy, speed, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [shipmentId, latitude, longitude, altitude ?? null, accuracy ?? null, speed ?? null]
  );

  return formatLocation(result.rows[0]);
}

async function getLocationHistory(shipmentId) {
  const result = await pool.query(
    `SELECT * FROM gps_locations
     WHERE shipment_id = $1
     ORDER BY recorded_at ASC`,
    [shipmentId]
  );

  return result.rows.map(formatLocation);
}

module.exports = { saveLocation, getLocationHistory, formatLocation };
