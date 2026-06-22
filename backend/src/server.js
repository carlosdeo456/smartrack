require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('express-async-errors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server running', timestamp: new Date() });
});

// API Routes
app.set('io', io);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/alerts', require('./routes/alerts'));

// WebSocket connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Real-time sensor data listener
  socket.on('sensor-data', (data) => {
    console.log('Sensor data received:', data);
    io.emit('sensor-update', data);
  });

  // Location update listener
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
        recordedAt: location.recordedAt
      };

      io.emit('location-change', payload);
    } catch (err) {
      console.error('Location update failed:', err.message);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready for real-time updates`);

  if (process.env.NODE_ENV !== 'production') {
    const { startLiveTracker } = require('./services/liveTracker');
    startLiveTracker(io);
  }
});

module.exports = { app, io };
