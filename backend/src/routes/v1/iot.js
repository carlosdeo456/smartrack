const express = require('express');
const auth = require('../../middleware/auth');
const iotAuth = require('../../middleware/iotAuth');
const iotController = require('../../controllers/iotController');

const router = express.Router();

router.get('/health', iotController.getHealth);
router.post('/devices/:deviceId/assign', auth, iotController.assignDevice);
router.use(iotAuth);router.post('/assign', iotController.assignDevice);
router.post('/shipments/:shipmentId/assign-device', iotController.assignDevice);
router.get('/devices/:deviceId/latest', iotController.getLatestTelemetry);
router.post('/telemetry', iotController.ingestTelemetry);
router.post('/shipments/:shipmentId/sensors', iotController.ingestSensor);
router.post('/shipments/:shipmentId/location', iotController.ingestLocation);
router.get('/shipments/:shipmentId/latest', iotController.getLatestTelemetry);

module.exports = router;
