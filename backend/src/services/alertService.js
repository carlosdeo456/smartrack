const pool = require('../config/database');
const limits = require('../config/limits');

function buildChecks(sensor) {
  const checks = [];
  const { temperature, humidity, shipmentId } = sensor;

  if (temperature != null) {
    if (temperature > limits.TEMPERATURE_MAX) {
      checks.push({
        shipmentId,
        alert_type: 'temperature_high',
        severity: temperature > limits.TEMPERATURE_MAX + 5 ? 'critical' : 'high',
        title: 'High temperature detected',
        description: `Temperature ${temperature}°C exceeds maximum of ${limits.TEMPERATURE_MAX}°C`,
        threshold_value: limits.TEMPERATURE_MAX,
        current_value: temperature
      });
    } else if (temperature < limits.TEMPERATURE_MIN) {
      checks.push({
        shipmentId,
        alert_type: 'temperature_low',
        severity: temperature < limits.TEMPERATURE_MIN - 5 ? 'critical' : 'high',
        title: 'Low temperature detected',
        description: `Temperature ${temperature}°C is below minimum of ${limits.TEMPERATURE_MIN}°C`,
        threshold_value: limits.TEMPERATURE_MIN,
        current_value: temperature
      });
    }
  }

  if (humidity != null) {
    if (humidity > limits.HUMIDITY_MAX) {
      checks.push({
        shipmentId,
        alert_type: 'humidity_high',
        severity: 'medium',
        title: 'High humidity detected',
        description: `Humidity ${humidity}% exceeds maximum of ${limits.HUMIDITY_MAX}%`,
        threshold_value: limits.HUMIDITY_MAX,
        current_value: humidity
      });
    } else if (humidity < limits.HUMIDITY_MIN) {
      checks.push({
        shipmentId,
        alert_type: 'humidity_low',
        severity: 'medium',
        title: 'Low humidity detected',
        description: `Humidity ${humidity}% is below minimum of ${limits.HUMIDITY_MIN}%`,
        threshold_value: limits.HUMIDITY_MIN,
        current_value: humidity
      });
    }
  }

  return checks;
}

function formatAlert(row) {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    trackingNumber: row.tracking_number,
    alertType: row.alert_type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    thresholdValue: row.threshold_value != null ? parseFloat(row.threshold_value) : null,
    currentValue: row.current_value != null ? parseFloat(row.current_value) : null,
    isResolved: row.is_resolved,
    createdAt: row.created_at
  };
}

async function createAlertIfNeeded(check) {
  const existing = await pool.query(
    `SELECT id FROM alerts
     WHERE shipment_id = $1 AND alert_type = $2 AND is_resolved = false
     LIMIT 1`,
    [check.shipmentId, check.alert_type]
  );

  if (existing.rows.length > 0) {
    return null;
  }

  const result = await pool.query(
    `INSERT INTO alerts (
      shipment_id, alert_type, severity, title, description,
      threshold_value, current_value
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      check.shipmentId,
      check.alert_type,
      check.severity,
      check.title,
      check.description,
      check.threshold_value,
      check.current_value
    ]
  );

  const withTracking = await pool.query(
    `SELECT a.*, s.tracking_number
     FROM alerts a
     JOIN shipments s ON s.id = a.shipment_id
     WHERE a.id = $1`,
    [result.rows[0].id]
  );

  return formatAlert(withTracking.rows[0]);
}

async function checkSensorAlerts(sensor, io) {
  const checks = buildChecks(sensor);
  const created = [];

  for (const check of checks) {
    const alert = await createAlertIfNeeded(check);
    if (alert) {
      created.push(alert);
      if (io) {
        io.emit('alert-triggered', alert);
      }
    }
  }

  return created;
}

async function resolveStaleAlerts(sensor) {
  const { shipmentId, temperature, humidity } = sensor;

  if (temperature != null && temperature >= limits.TEMPERATURE_MIN && temperature <= limits.TEMPERATURE_MAX) {
    await pool.query(
      `UPDATE alerts SET is_resolved = true, resolved_at = NOW()
       WHERE shipment_id = $1 AND alert_type IN ('temperature_high', 'temperature_low') AND is_resolved = false`,
      [shipmentId]
    );
  }

  if (humidity != null && humidity >= limits.HUMIDITY_MIN && humidity <= limits.HUMIDITY_MAX) {
    await pool.query(
      `UPDATE alerts SET is_resolved = true, resolved_at = NOW()
       WHERE shipment_id = $1 AND alert_type IN ('humidity_high', 'humidity_low') AND is_resolved = false`,
      [shipmentId]
    );
  }
}

module.exports = { checkSensorAlerts, resolveStaleAlerts, formatAlert };
