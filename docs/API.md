# SmartTrack - Documentation

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout user

### Shipments
- `GET /api/shipments` - List all shipments
- `GET /api/shipments/:id` - Get shipment details
- `POST /api/shipments` - Create new shipment
- `PUT /api/shipments/:id` - Update shipment
- `DELETE /api/shipments/:id` - Delete shipment

### Tracking
- `GET /api/shipments/:id/location` - Get current location
- `GET /api/shipments/:id/sensors` - Get sensor data
- `GET /api/shipments/:id/history` - Get tracking history

### Sensors
- `POST /api/sensors/data` - Submit sensor data
- `GET /api/sensors/:shipmentId/latest` - Get latest sensor reading

### RFID
- `POST /api/rfid/scan` - Register RFID scan
- `GET /api/rfid/:shipmentId/history` - Get scan history

### Alerts
- `GET /api/alerts` - List alerts
- `GET /api/alerts/:id` - Get alert details
- `PUT /api/alerts/:id/resolve` - Mark alert as resolved

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Routes
- `GET /api/routes` - List delivery routes
- `POST /api/routes` - Create route
- `GET /api/routes/:id` - Get route details

## 🔌 WebSocket Events

### Client to Server
- `sensor-data` - Send sensor readings
- `location-update` - Send GPS location
- `rfid-scan` - Send RFID scan event

### Server to Client
- `sensor-update` - Broadcast sensor data
- `location-change` - Broadcast location update
- `alert-triggered` - Send alert notification
- `shipment-status-changed` - Broadcast status change

## 📦 Request/Response Examples

### Create Shipment
```json
{
  "tracking_number": "SHIP-001",
  "origin_location": "New York",
  "destination_location": "Los Angeles",
  "sender_id": 1,
  "driver_id": 2,
  "weight": 5.5,
  "contents": "Electronics",
  "expected_delivery": "2024-01-15"
}
```

### Sensor Data
```json
{
  "shipment_id": 1,
  "temperature": 22.5,
  "humidity": 65,
  "pressure": 1013.25,
  "sensor_id": "SENSOR-001",
  "recorded_at": "2024-01-10T10:30:00Z"
}
```

### Location Data
```json
{
  "shipment_id": 1,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "altitude": 10,
  "accuracy": 5,
  "speed": 25
}
```

## 🛠️ Development Guide

### Running Backend Tests
```bash
cd backend
npm test
```

### Running Frontend Tests
```bash
cd frontend
npm test
```

### Database Migrations
```bash
npm run migrate
```

### Start Development
```bash
npm run dev
```

## 📱 Mobile Integration

IoT devices should send data via HTTP REST API or MQTT:

**REST API Example:**
```bash
POST http://localhost:5000/api/sensors/data
Content-Type: application/json
Authorization: Bearer {JWT_TOKEN}

{
  "shipment_id": 1,
  "temperature": 22.5,
  "humidity": 65,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "rfid_tag": "TAG-12345"
}
```

**MQTT Topic:**
`smartrack/sensors/{shipmentId}`

## 🔒 Security

- JWT authentication for all API endpoints
- HTTPS only in production
- Input validation on all requests
- SQL injection prevention via parameterized queries
- CORS configuration for authorized domains
- Rate limiting on public endpoints

## 🚀 Performance Tips

1. Use Redis caching for frequently accessed data
2. Index database queries for common filters
3. Implement pagination for list endpoints
4. Use WebSocket for real-time updates (not polling)
5. Compress API responses

## 📊 Monitoring

- Application logs stored in `/logs` directory
- Database query logs for performance monitoring
- WebSocket connection metrics
- Sensor data validation and error tracking
