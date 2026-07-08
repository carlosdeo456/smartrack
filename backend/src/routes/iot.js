const express = require('express');
const auth = require('../middleware/auth');
const iotAuth = require('../middleware/iotAuth');
const iotController = require('../controllers/iotController');

const router = express.Router();

router.get('/health', iotController.getHealth);

// Web admin: link ESP tracker to shipment (JWT Bearer — not IoT API key)
router.post('/devices/:deviceId/assign', auth, iotController.assignDevice);

router.use(iotAuth);

// Legacy device-compatible GPS route.
router.post('/assign', iotController.assignDevice);
router.post('/gps', iotController.ingestTelemetry);
router.get('/gps/latest', iotController.getLatestTelemetry);
router.get('/devices/:deviceId/latest', iotController.getLatestTelemetry);

module.exports = router;