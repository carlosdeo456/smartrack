# SmartTrack Setup Guide

## Quick Start

### Prerequisites
- Node.js 16+ & npm
- PostgreSQL 12+
- Git

### One-command setup

From the project root:

```bash
npm install
npm run setup
```

Edit `backend/.env` with your PostgreSQL credentials, then:

```bash
npm run migrate
npm run dev
```

This starts both services:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

---

## Manual Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your configurations
npm run migrate
npm run dev
```

### 2. Frontend (new terminal)

```bash
cd frontend
npm install
npm start
```

### 3. Database

Create a PostgreSQL database and apply the schema:

```bash
# Create database (psql or pgAdmin)
createdb smartrack

# Apply schema via npm (from project root)
npm run migrate

# Or load schema directly with psql
psql smartrack < database/schema.sql
```

---

## Configuration

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/smartrack
JWT_SECRET=your-strong-secret-key
CORS_ORIGIN=http://localhost:3000
MQTT_BROKER=mqtt://broker.hivemq.com:1883
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## Root Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Install all deps and create `.env` files |
| `npm run dev` | Start backend + frontend concurrently |
| `npm run dev:backend` | Start backend only |
| `npm run dev:frontend` | Start frontend only |
| `npm run migrate` | Apply database schema |

---

## IoT Device Setup

### Hardware Requirements
- Arduino Uno / Raspberry Pi
- GPS Module (NEO-6M)
- DHT22 Temperature/Humidity Sensor
- RFID Reader (RC522)
- WiFi/GSM Module (for connectivity)

### Arduino Libraries
```
- TinyGPS++
- DHT
- ArduinoJson
- RFID
```

### Upload Code
1. Open `iot-device/smartrack_device.ino` in Arduino IDE
2. Select board and COM port
3. Upload sketch
4. Monitor serial output

---

## Database Schema

### Main Tables
- **users** - User accounts (admin, driver, customer)
- **shipments** - Parcel tracking records
- **gps_locations** - GPS coordinates over time
- **sensor_data** - Temperature, humidity readings
- **rfid_scans** - RFID checkpoint scanning
- **alerts** - Anomaly alerts and notifications
- **notifications** - User notifications
- **routes** - Delivery routes

---

## Real-Time Features

### WebSocket Events (Live Updates)

**Sent by IoT Device:**
```javascript
socket.emit('sensor-data', {
  shipmentId: 1,
  temperature: 22.5,
  humidity: 65,
  timestamp: Date.now()
});

socket.emit('location-update', {
  shipmentId: 1,
  latitude: 40.7128,
  longitude: -74.0060
});
```

**Received by Dashboard:**
```javascript
socket.on('sensor-update', (data) => {
  updateTemperature(data.temperature);
  updateHumidity(data.humidity);
});

socket.on('location-change', (data) => {
  updateMapMarker(data.latitude, data.longitude);
});

socket.on('alert-triggered', (alert) => {
  showAlert(alert.message, alert.severity);
});
```

---

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### API Testing with cURL
```bash
curl http://localhost:5000/health

curl -X GET http://localhost:5000/api/shipments \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

---

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify `.env` configuration in `backend/.env`
- Check port 5000 is available

### Frontend won't connect to backend
- Verify `REACT_APP_API_URL` in `frontend/.env`
- Check CORS settings in backend
- Ensure backend is running

### Database connection failed
- Ensure PostgreSQL service is running
- Check `DATABASE_URL` in `backend/.env`
- Verify user permissions and that the `smartrack` database exists

---

## Production Deployment

For production, deploy each service separately:
- **Backend:** Node.js on a VPS, Railway, Render, or cloud VM
- **Frontend:** Static build (`npm run build`) served via Netlify, Vercel, or nginx
- **Database:** Managed PostgreSQL (AWS RDS, Supabase, Neon, etc.)

---

## Support

- GitHub Issues: Report bugs and request features
- Documentation: See `/docs` directory
- API Documentation: See `docs/API.md`

---

## License

MIT License - Feel free to use and modify
