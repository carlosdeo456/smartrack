require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
require('express-async-errors');

const { PORT, HOST, isProduction, ENABLE_SIMULATED_GPS } = require('./config/env');
const pool = require('./config/database');
const { corsOptions } = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFound');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: corsOptions(),
});

// Security & parsing
app.use(helmet());
app.use(cors(corsOptions()));
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging (skip in production noise reduction optional)
app.use((req, res, next) => {
  if (!isProduction) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// Health check — use from any client to verify LAN connectivity
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'smartrack-api',
      message: 'Backend API is running. Open the Vercel web app for the dashboard UI.',
      health: '/health',
    },
  });
});

app.get('/health', async (req, res) => {
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
      service: 'smartrack-api',
      db,
      timestamp: new Date().toISOString(),
    },
  });
});

// API Routes
app.set('io', io);

// Versioned decoupled API (web + mobile clients)
app.use('/api/v1', require('./routes/v1'));

// Legacy SmartTrack domain routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/iot', require('./routes/iot'));

// WebSocket connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  socket.on('sensor-data', (data) => {
    io.emit('sensor-update', data);
  });

  socket.on('location-update', async (data) => {
    try {
      const shipmentId = data.shipmentId || data.shipment_id;
      if (!shipmentId || data.latitude == null || data.longitude == null) return;

      const { saveLocation } = require('./services/gpsService');
      const location = await saveLocation(shipmentId, data);

      const payload = {
        shipmentId: parseInt(shipmentId, 10),
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        recordedAt: location.recordedAt,
      };

      io.emit('location-change', payload);
    } catch (err) {
      console.error('Location update failed:', err.message);
    }
  });

  socket.on('join-shipment-chat', (data = {}) => {
    try {
      const { verifyShipmentChatToken } = require('./services/shipmentChatService');
      const payload = verifyShipmentChatToken(data.token);
      socket.join(`shipment-chat:${payload.shipmentId}`);
    } catch (err) {
      socket.emit('shipment-chat-error', { error: 'Invalid or expired shipment chat access token' });
    }
  });

  socket.on('leave-shipment-chat', (data = {}) => {
    if (!data.shipmentId) return;
    socket.leave(`shipment-chat:${data.shipmentId}`);
  });
});

// 404 + centralized errors
app.use(notFoundHandler);
app.use(errorHandler);

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
  console.log(`LAN clients should use http://<your-local-ip>:${PORT}`);
  console.log(`API v1 items: http://<your-local-ip>:${PORT}/api/v1/items`);
  console.log(`API v1 iot: http://<your-local-ip>:${PORT}/api/v1/iot/health`);

  if (!isProduction && ENABLE_SIMULATED_GPS) {
    const { startLiveTracker } = require('./services/liveTracker');
    startLiveTracker(io);
  } else if (!isProduction) {
    console.log('📍 Simulated GPS disabled (set ENABLE_SIMULATED_GPS=true to enable)');
  }
});

module.exports = { app, io, server };
