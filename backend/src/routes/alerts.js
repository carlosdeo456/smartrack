const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { formatAlert } = require('../services/alertService');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const resolved = req.query.resolved === 'true';
  const result = await pool.query(
    `SELECT a.*, s.tracking_number
     FROM alerts a
     JOIN shipments s ON s.id = a.shipment_id
     WHERE a.is_resolved = $1
     ORDER BY a.created_at DESC
     LIMIT 50`,
    [resolved]
  );

  res.json(result.rows.map(formatAlert));
});

router.put('/:id/resolve', auth, async (req, res) => {
  const result = await pool.query(
    `UPDATE alerts SET is_resolved = true, resolved_at = NOW()
     WHERE id = $1 AND is_resolved = false
     RETURNING *`,
    [req.params.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Alert not found or already resolved' });
  }

  const withTracking = await pool.query(
    `SELECT a.*, s.tracking_number
     FROM alerts a
     JOIN shipments s ON s.id = a.shipment_id
     WHERE a.id = $1`,
    [req.params.id]
  );

  res.json(formatAlert(withTracking.rows[0]));
});

module.exports = router;
