# Decoupled API Architecture — Setup Guide

SmartTrack uses a **single centralized backend** that serves:

| Client | Stack | Config |
|--------|-------|--------|
| Web | React (`frontend/`) | `REACT_APP_API_URL` |
| Mobile | Flutter (`mobile/`) | `--dart-define=API_BASE_URL=...` |
| Backend | Node + Express + PostgreSQL (`backend/`) | `.env` |

All clients talk to the same versioned API (`/api/v1/...`) over HTTP. In development, machines on the **same Wi-Fi** use the backend PC's **local IP**. In production, point all clients to your cloud API domain.

---

## Server PC only

For the current LAN setup, treat `192.168.1.32` as the single source of truth:

- Edit `backend/.env` on **`192.168.1.32` only**
- Run PostgreSQL and the backend on **`192.168.1.32` only**
- Keep `npm run dev` running on **`192.168.1.32`** whenever you want live IoT GPS ingestion
- Point the ESP8266 to **`http://192.168.1.32:5000`**

Your laptop can still be used to edit code or upload Arduino sketches, but it should not be the backend target unless you intentionally move the server there.

---

## Three separate machines (typical lab setup)

Web, mobile, and backend are often on **different physical devices**. Only the **backend machine's IP** matters for the API URL.

```
  Machine B (Web PC)          Machine C (Phone)
  React :3000                 Flutter app
  IP: 192.168.1.20              Wi-Fi only
        │                            │
        │    same Wi-Fi / LAN        │
        └──────────┬─────────────────┘
                   ▼
        Machine A (API + Database)
        Node :5000  PostgreSQL
        IP: 192.168.1.10   ← everyone points HERE
```

| Machine | Role | What to configure |
|---------|------|-------------------|
| **A** | Backend + DB | `HOST=0.0.0.0`, firewall port 5000, `CORS_ORIGINS` includes **Machine B's** React URL |
| **B** | React web | `REACT_APP_API_URL=http://192.168.1.10:5000` (Machine **A**, not B) |
| **C** | Flutter phone | `API_BASE_URL=http://192.168.1.10:5000` (Machine **A**) |

**Rules**

1. **Never** set the API URL to `localhost` on Machine B or C unless the backend also runs on that same machine.
2. **CORS** is only for browsers (React on Machine B). Add `http://192.168.1.20:3000` (Machine B's IP + React port), not the backend IP.
3. **Mobile** has no CORS; it only needs Machine A reachable on Wi-Fi.
4. Test from Machine B browser: `http://192.168.1.10:5000/health` before starting React.
5. Test from phone browser: same URL before running Flutter.

Replace `192.168.1.10` / `192.168.1.20` with your real IPs from `ipconfig` on each PC.

---

## Architecture overview

```
┌─────────────────┐     ┌─────────────────┐
│  React Web      │     │  Flutter Mobile │
│  :3000          │     │  (phone/emulator)│
└────────┬────────┘     └────────┬────────┘
         │   HTTP (LAN or cloud) │
         └──────────┬────────────┘
                    ▼
         ┌──────────────────────┐
         │  Node.js + Express   │
         │  HOST=0.0.0.0 :5000  │
         │  helmet + cors       │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │  PostgreSQL          │
         │  pg.Pool             │
         └──────────────────────┘
```

**Backend layers**

```
backend/src/
  config/          # env, database pool, CORS
  routes/v1/       # versioned route definitions
  controllers/     # request handlers
  middleware/      # errorHandler, auth, notFound
  services/        # domain logic (shipments, GPS, etc.)
```

---

## Step 1 — Backend setup

### 1.1 Install dependencies

```bash
cd backend
npm install
```

### 1.2 Environment file

Copy the template and edit:

```bash
cp .env.example .env
```

Key variables for the **server PC**:

```env
PORT=5000
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL=postgresql://postgres:your-real-password@localhost:5432/smartrack
CORS_ORIGIN=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://192.168.1.10:3000
```

- **`HOST=0.0.0.0`** — listen on all interfaces so phones and other PCs on Wi-Fi can connect (not only localhost).
- **`CORS_ORIGINS`** — add the **web client's machine** origin: `http://<WEB-PC-IP>:3000` (not the backend IP). Example if React runs on Machine B at `192.168.1.20`:

```env
CORS_ORIGINS=http://localhost:3000,http://192.168.1.20:3000,http://127.0.0.1:3000
```

### 1.3 Database + items table

```bash
node database/migrate-items.js
```

### 1.4 Start API

```bash
npm run dev
```

Keep this running on the **server PC** for live GPS ingestion.

Verify locally:

```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/v1/items
```

---

## Step 2 — Find your local IP (LAN)

Clients must use your **backend machine's Wi-Fi IP**, not `localhost`.

### Windows

```powershell
ipconfig
```

Look for **Wireless LAN adapter Wi-Fi** → **IPv4 Address**, e.g. `192.168.1.10`.

Or:

```powershell
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi").IPAddress
```

### macOS

```bash
ipconfig getifaddr en0
```

Or **System Settings → Network → Wi-Fi → Details → IP address**.

### Test from another device

From phone browser or another PC on the same Wi-Fi:

```
http://192.168.1.10:5000/health
```

If this fails, check firewall (below).

---

## Step 2.5 — ESP one-time setup

1. Create a shipment in SmartTrack from the web or mobile app connected to the server.
2. Note the real tracking number, for example `ST-1-UFYMX8`.
3. Open `iot-device/smartrack_device.ino`.
4. Set:

```cpp
const char* TRACKING_NUMBER = "ST-1-UFYMX8";
```

5. Re-upload the sketch to the ESP8266.

The backend will accept the payload only if that tracking number exists in PostgreSQL on the server PC.

**Success looks like:**

```text
[HTTP] POST http://192.168.1.32:5000/api/iot/gps -> 201
```

If the response says `Shipment not found`, the tracking number in the sketch does not match the server database.

---

## Step 3 — Firewall & network

### Windows Firewall

Allow inbound TCP on port **5000**:

1. **Windows Security → Firewall → Advanced settings**
2. **Inbound Rules → New Rule**
3. Port → TCP → **5000** → Allow

Or PowerShell (admin):

```powershell
New-NetFirewallRule -DisplayName "SmartTrack API 5000" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

### Same network

- Backend PC and clients must be on the **same Wi-Fi** (not guest network isolated from LAN).
- Corporate/school networks may block device-to-device traffic.

---

## Step 4 — React web client

### 4.1 Configure API URL

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
# Machine B — API is on Machine A (backend PC), NOT localhost unless backend is on this PC
REACT_APP_API_URL=http://192.168.1.10:5000
```

Use the **backend machine's IP** (Machine A), even when React runs on a different PC (Machine B).

### 4.2 Run + demo page

```bash
npm start
```

Open:

- **Items API demo:** http://localhost:3000/items-demo
- Component: `frontend/src/components/examples/ItemsList.jsx`

---

## Step 5 — Flutter mobile client

```bash
cd mobile
flutter pub get
```

### Physical phone (same Wi-Fi as backend PC)

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:5000
```

### Android Emulator (backend on host PC)

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000
```

### Why not localhost on mobile?

| Environment | `localhost` means | Use instead |
|-------------|-------------------|-------------|
| Physical phone | The phone itself | `http://192.168.x.x:5000` |
| Android Emulator | The emulator | `http://10.0.2.2:5000` |
| iOS Simulator | Host Mac (works) | `http://localhost:5000` |
| iOS physical device | The iPhone | LAN IP of backend PC |

Code: `mobile/lib/config/api_config.dart` and comments in `api_service.dart`.

---

## Step 6 — Production (cloud)

1. Deploy backend (Railway, Fly.io, AWS, etc.) with `NODE_ENV=production`.
2. Set `DATABASE_URL` to managed PostgreSQL.
3. Set `CORS_ORIGINS=https://app.yourdomain.com`.
4. React: `REACT_APP_API_URL=https://api.yourdomain.com` at build time.
5. Flutter: `flutter build apk --dart-define=API_BASE_URL=https://api.yourdomain.com`.

---

## API v1 — Items CRUD

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/items` | List all items |
| POST | `/api/v1/items` | Create `{ title, description?, status? }` |
| DELETE | `/api/v1/items/:id` | Delete by id |

**Success response shape:**

```json
{
  "success": true,
  "data": [ { "id": 1, "title": "...", "description": null, "status": "active", "created_at": "..." } ]
}
```

**Error response shape:**

```json
{
  "success": false,
  "error": { "message": "...", "status": 400 }
}
```

In **production**, internal/database errors are masked. In **development**, extra `detail` is included.

---

## API v1 — IoT Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/iot/health` | IoT API health check |
| POST | `/api/v1/iot/telemetry` | Ingest sensor and/or GPS telemetry |
| POST | `/api/v1/iot/shipments/:shipmentId/sensors` | Ingest sensor-only payload |
| POST | `/api/v1/iot/shipments/:shipmentId/location` | Ingest location-only payload |
| GET | `/api/v1/iot/shipments/:shipmentId/latest` | Latest sensor + location snapshot |

**Telemetry example:**

```json
{
  "shipmentId": 1,
  "deviceId": "ESP32-01",
  "temperature": 22.5,
  "humidity": 65,
  "pressure": 1013.25,
  "latitude": -6.7924,
  "longitude": 39.2083,
  "accuracy": 5,
  "speed": 18
}
```

Set `IOT_API_KEY` in `backend/.env` to protect these endpoints. Devices can send it as `X-IoT-Api-Key` or `Authorization: Bearer <key>`.

For ESP8266 compatibility, the backend also supports the legacy route:

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/iot/gps` | Device-friendly GPS + sensor ingest |
| GET | `/api/iot/gps/latest?trackingNumber=...` | Latest telemetry by tracking number |

---

## Quick troubleshooting

| Problem | Fix |
|---------|-----|
| `Network request failed` on phone | Use LAN IP, not localhost; same Wi-Fi |
| CORS error in browser | Add React URL to `CORS_ORIGINS` in backend `.env` |
| Connection timeout | Firewall port 5000; `HOST=0.0.0.0` |
| Empty items list | Run `node backend/database/migrate-items.js` |
| Android emulator can't reach API | Use `10.0.2.2` not `127.0.0.1` |

---

## Directory map

```
smartrack/
  backend/src/
    config/           database.js, cors.js, env.js
    controllers/      itemsController.js
    routes/v1/        items.js, index.js
    middleware/       errorHandler.js, notFound.js
  database/
    schema-items.sql
  frontend/src/
    components/examples/ItemsList.jsx
    pages/ItemsDemoPage.jsx
  mobile/lib/
    config/api_config.dart
    models/item.dart
    services/api_service.dart
  docs/DECOUPLED_API_SETUP.md   (this file)
```
