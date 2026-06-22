const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { checkSensorAlerts, resolveStaleAlerts } = require('../services/alertService');

const router = express.Router();

function formatSensor(row) {
  return {
    shipmentId: row.shipment_id,
    temperature: row.temperature != null ? parseFloat(row.temperature) : null,
    humidity: row.humidity != null ? parseFloat(row.humidity) : null,
    pressure: row.pressure != null ? parseFloat(row.pressure) : null,
    sensorId: row.sensor_id,
    recordedAt: row.recorded_at
  };
}

router.get('/:shipmentId/latest', async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM sensor_data
     WHERE shipment_id = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [req.params.shipmentId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'No sensor data found' });
  }

  res.json(formatSensor(result.rows[0]));
});

router.post('/data', auth, async (req, res) => {
  const { shipment_id, shipmentId, temperature, humidity, pressure, sensor_id, sensorId } = req.body;
  const id = shipment_id || shipmentId;

  if (!id) {
    return res.status(400).json({ error: 'shipment_id is required' });
  }

  const result = await pool.query(
    `INSERT INTO sensor_data (shipment_id, temperature, humidity, pressure, sensor_id, recorded_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [id, temperature ?? null, humidity ?? null, pressure ?? null, sensor_id || sensorId || null]
  );

  const sensor = formatSensor(result.rows[0]);
  const io = req.app.get('io');

  await resolveStaleAlerts(sensor);
  const alerts = await checkSensorAlerts(sensor, io);

  if (io) {
    io.emit('sensor-update', sensor);
  }

  res.status(201).json({ ...sensor, alerts });
});

module.exports = router;
