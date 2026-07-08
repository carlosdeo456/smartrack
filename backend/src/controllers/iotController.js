const pool = require('../config/database');
const { checkSensorAlerts, resolveStaleAlerts } = require('../services/alertService');
const ApiError = require('../utils/ApiError');
const { normalizeTrackingNumber } = require('../services/trackingIdService');
const {
  normalizeDeviceId,
  findActiveAssignmentByDeviceId,
  assignDeviceToShipment,
} = require('../services/iotDeviceAssignmentService');

function parseShipmentId(value) {
  if (value == null || value === '') {
    throw new ApiError(400, 'A valid shipment reference is required');
  }

  const shipmentId = parseInt(value, 10);
  if (!Number.isNaN(shipmentId) && shipmentId > 0) {
    return shipmentId;
  }

  return null;
}

function optionalNumber(value, fieldName) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ApiError(400, `${fieldName} must be a valid number`);
  }

  return parsed;
}

function buildSensorPayload(row) {
  if (!row) return null;

  return {
    shipmentId: row.shipment_id,
    temperature: row.temperature != null ? parseFloat(row.temperature) : null,
    humidity: row.humidity != null ? parseFloat(row.humidity) : null,
    pressure: row.pressure != null ? parseFloat(row.pressure) : null,
    sensorId: row.sensor_id,
    recordedAt: row.recorded_at,
  };
}

function buildLocationPayload(row, { fromTracker = false } = {}) {
  if (!row) return null;

  return {
    shipmentId: row.shipment_id,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    altitude: row.altitude != null ? parseFloat(row.altitude) : null,
    accuracy: row.accuracy != null ? parseFloat(row.accuracy) : null,
    speed: row.speed != null ? parseFloat(row.speed) : null,
    recordedAt: row.recorded_at,
    fromTracker,
  };
}

async function findShipmentId(value) {
  const numericId = parseShipmentId(value);
  if (numericId) {
    return numericId;
  }

  const trackingNumber = normalizeTrackingNumber(String(value));
  if (!trackingNumber) {
    throw new ApiError(400, 'A valid shipment reference is required');
  }

  const result = await pool.query(
    'SELECT id FROM shipments WHERE UPPER(tracking_number) = UPPER($1) LIMIT 1',
    [trackingNumber]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Shipment not found');
  }

  return result.rows[0].id;
}

async function findShipmentIdFromDeviceId(deviceId) {
  const assignment = await findActiveAssignmentByDeviceId(pool, deviceId);
  if (!assignment) {
    throw new ApiError(404, `No active shipment assignment found for device ${normalizeDeviceId(deviceId)}`);
  }

  return assignment.shipment_id;
}

async function ensureShipmentExists(shipmentId) {
  const result = await pool.query('SELECT id FROM shipments WHERE id = $1', [shipmentId]);
  if (result.rows.length === 0) {
    throw new ApiError(404, 'Shipment not found');
  }
}

async function insertSensorReading({ shipmentId, temperature, humidity, pressure, sensorId }) {
  const result = await pool.query(
    `INSERT INTO sensor_data (shipment_id, temperature, humidity, pressure, sensor_id, recorded_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [shipmentId, temperature, humidity, pressure, sensorId]
  );

  return buildSensorPayload(result.rows[0]);
}

async function insertLocationReading({
  shipmentId,
  latitude,
  longitude,
  altitude,
  accuracy,
  speed,
}) {
  const result = await pool.query(
    `INSERT INTO gps_locations (shipment_id, latitude, longitude, altitude, accuracy, speed, source, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'tracker', NOW())
     RETURNING *`,
    [shipmentId, latitude, longitude, altitude, accuracy, speed]
  );

  return buildLocationPayload(result.rows[0]);
}

function extractShipmentId(req) {
  const deviceId = normalizeDeviceId(
    req.body.deviceId
      || req.body.device_id
      || req.params.deviceId
      || req.query.deviceId
      || req.query.device_id
  );

  if (deviceId) {
    return findShipmentIdFromDeviceId(deviceId);
  }

  return findShipmentId(
    req.params.shipmentId
      || req.body.shipmentId
      || req.body.shipment_id
      || req.body.trackingNumber
      || req.body.tracking_number
  );
}

function buildSensorInput(body) {
  const temperature = optionalNumber(body.temperature, 'temperature');
  const humidity = optionalNumber(body.humidity, 'humidity');
  const pressure = optionalNumber(body.pressure, 'pressure');
  const sensorId = body.sensorId || body.sensor_id || body.deviceId || body.device_id || null;

  if (temperature == null && humidity == null && pressure == null) {
    return null;
  }

  return { temperature, humidity, pressure, sensorId };
}

function buildLocationInput(body) {
  const latitude = optionalNumber(body.latitude, 'latitude');
  const longitude = optionalNumber(body.longitude, 'longitude');
  const altitude = optionalNumber(body.altitude, 'altitude');
  const accuracy = optionalNumber(body.accuracy, 'accuracy');
  const speed = optionalNumber(
    body.speed ?? body.speed_kmph ?? body.speedKmph,
    'speed'
  );

  if (latitude == null && longitude == null && altitude == null && accuracy == null && speed == null) {
    return null;
  }

  if (latitude == null || longitude == null) {
    throw new ApiError(400, 'latitude and longitude are required together');
  }

  return { latitude, longitude, altitude, accuracy, speed };
}

async function getLatestTelemetry(req, res) {
  const deviceId = normalizeDeviceId(
    req.params.deviceId
      || req.query.deviceId
      || req.query.device_id
  );

  const shipmentId = deviceId
    ? await findShipmentIdFromDeviceId(deviceId)
    : await findShipmentId(
      req.params.shipmentId
        || req.query.shipmentId
        || req.query.shipment_id
        || req.query.trackingNumber
        || req.query.tracking_number
    );
  await ensureShipmentExists(shipmentId);

  const [sensorResult, locationResult] = await Promise.all([
    pool.query(
      `SELECT * FROM sensor_data
       WHERE shipment_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [shipmentId]
    ),
    pool.query(
      `SELECT * FROM gps_locations
       WHERE shipment_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [shipmentId]
    ),
  ]);

  res.json({
    success: true,
    data: {
      shipmentId,
      deviceId: deviceId || null,
      sensor: buildSensorPayload(sensorResult.rows[0] || null),
      location: buildLocationPayload(locationResult.rows[0] || null, {
        fromTracker: Boolean(deviceId),
      }),
    },
  });
}

async function assignDevice(req, res) {
  const deviceId = normalizeDeviceId(
    req.body.deviceId
      || req.body.device_id
      || req.params.deviceId
  );

  if (!deviceId) {
    throw new ApiError(400, 'device_id is required');
  }

  const shipmentId = await findShipmentId(
    req.params.shipmentId
      || req.body.shipmentId
      || req.body.shipment_id
      || req.body.trackingNumber
      || req.body.tracking_number
  );

  await ensureShipmentExists(shipmentId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const assignment = await assignDeviceToShipment(client, { shipmentId, deviceId });
    const shipmentResult = await client.query(
      'SELECT tracking_number FROM shipments WHERE id = $1',
      [shipmentId]
    );
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        shipmentId,
        trackingNumber: shipmentResult.rows[0]?.tracking_number || null,
        deviceId: assignment.device_id,
        assignedAt: assignment.assigned_at,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function ingestSensor(req, res) {
  const shipmentId = await extractShipmentId(req);
  const sensorInput = buildSensorInput(req.body);

  if (!sensorInput) {
    throw new ApiError(400, 'At least one sensor field is required');
  }

  await ensureShipmentExists(shipmentId);

  const sensor = await insertSensorReading({ shipmentId, ...sensorInput });
  const io = req.app.get('io');

  await resolveStaleAlerts(sensor);
  const alerts = await checkSensorAlerts(sensor, io);

  if (io) {
    io.emit('sensor-update', sensor);
  }

  res.status(201).json({
    success: true,
    data: {
      shipmentId,
      sensor,
      alerts,
    },
  });
}

async function ingestLocation(req, res) {
  const shipmentId = await extractShipmentId(req);
  const locationInput = buildLocationInput(req.body);

  if (!locationInput) {
    throw new ApiError(400, 'Latitude and longitude are required');
  }

  await ensureShipmentExists(shipmentId);

  const location = await insertLocationReading({ shipmentId, ...locationInput });
  const io = req.app.get('io');

  if (io) {
    io.emit('location-change', {
      ...location,
      shipmentId,
      fromTracker: true,
    });
  }

  res.status(201).json({
    success: true,
    data: {
      shipmentId,
      location,
    },
  });
}

async function ingestTelemetry(req, res) {
  const shipmentId = await extractShipmentId(req);
  const sensorInput = buildSensorInput(req.body);
  const locationInput = buildLocationInput(req.body);
  const deviceId = normalizeDeviceId(req.body.deviceId || req.body.device_id);

  if (!sensorInput && !locationInput) {
    throw new ApiError(
      400,
      'Telemetry payload must include sensor values and/or latitude with longitude'
    );
  }

  await ensureShipmentExists(shipmentId);

  const io = req.app.get('io');
  let sensor = null;
  let alerts = [];
  let location = null;

  if (sensorInput) {
    sensor = await insertSensorReading({ shipmentId, ...sensorInput });
    await resolveStaleAlerts(sensor);
    alerts = await checkSensorAlerts(sensor, io);

    if (io) {
      io.emit('sensor-update', sensor);
    }
  }

  if (locationInput) {
    location = await insertLocationReading({ shipmentId, ...locationInput });
    location = { ...location, fromTracker: Boolean(deviceId) };

    if (io) {
      io.emit('location-change', {
        ...location,
        shipmentId,
        fromTracker: Boolean(deviceId),
      });
    }
  }

  res.status(201).json({
    success: true,
    data: {
      shipmentId,
      deviceId: deviceId || sensor?.sensorId || null,
      sensor,
      location,
      alerts,
    },
  });
}

async function getHealth(req, res) {
  let db = 'disconnected';

  try {
    await pool.query('SELECT 1');
    db = 'connected';
  } catch (err) {
    db = 'disconnected';
  }

  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'smartrack-iot',
      db,
      requiresApiKey: Boolean(process.env.IOT_API_KEY),
      timestamp: new Date().toISOString(),
    },
  });
}

module.exports = {
  assignDevice,
  getHealth,
  ingestTelemetry,
  ingestSensor,
  ingestLocation,
  getLatestTelemetry,
};
