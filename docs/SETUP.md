# SmartTrack Setup Guide

## Quick Start

### Server PC only

The backend and PostgreSQL must run on the **server PC** only. In your current LAN setup, that machine is:

- **Server PC:** `192.168.1.32`
- **Role:** runs Node/Express backend + PostgreSQL and stores all GPS data

Do **not** edit backend DB credentials on a different laptop and expect the ESP to use them. The ESP and all clients should talk to the backend running on the server PC.

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

Edit `backend/.env` on the **server PC** with the PostgreSQL username/password from that same machine, then:

```bash
npm run db:setup
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
# Edit .env on the server PC and add that PC's PostgreSQL credentials
npm run db:setup
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
npm run db:setup

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
| `npm run db:setup` | Apply backend database schema |
| `npm run db:setup:win` | Windows alias for database schema setup |
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
1. Create a shipment in SmartTrack on the **server PC** and note the real tracking number.
2. Open `iot-device/smartrack_device.ino` in Arduino IDE.
3. Set `TRACKING_NUMBER` to that real value, for example `ST-1-UFYMX8`.
4. Select board and COM port.
5. Upload the sketch.
6. Monitor serial output or your Wi-Fi bridge logs.

Success means the sender posts to the backend on the server PC and receives a `201` response from:

```text
http://192.168.1.32:5000/api/iot/gps
```

If you see `Shipment not found`, the tracking number in the sketch does not match a shipment in the server database.

### Machine roles

| Machine | Role |
|---------|------|
| `192.168.1.32` | Server PC: backend + PostgreSQL, stores all GPS data |
| Your laptop / dev PC | Upload Arduino code, frontend/backend development if needed |
| ESP8266 / GPS device | Sends GPS data to `192.168.1.32:5000` only |

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
