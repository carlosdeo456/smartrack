const express = require('express');
const iotRouter = require('./iot');
const itemsRouter = require('./items');

const router = express.Router();

router.use('/iot', iotRouter);
router.use('/items', itemsRouter);

module.exports = router;
