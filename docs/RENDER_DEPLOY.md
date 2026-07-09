# Deploy SmartTrack API on Render (free, no credit card)

Use this if **Fly.io asks for a credit card**. You still get a **fixed URL** like:

```
https://smartrack-api.onrender.com
```

Database stays on **Neon** (free) — do **not** create a Render PostgreSQL database (that triggers payment / expiry).

---

## Why Fly failed

```
We need your payment information to continue!
Could not find App "smartrack-api"
```

Fly.io now requires billing before creating apps. The app was never created, so `flyctl secrets set` also failed.

---

## Architecture

```
Web (Firebase/Vercel)  ──►  Render API (free)  ──►  Neon PostgreSQL (free)
Mobile APK             ──►  smartrack-api.onrender.com
ESP tracker            ──►  /api/iot/gps
```

Your PC can be off. No Cloudflare tunnel.

**Trade-off:** Free Render sleeps after ~15 min idle. First request after sleep takes ~30–60 seconds (cold start).

---

## Step 1 — Neon database (you may already have this)

1. [console.neon.tech](https://console.neon.tech) → project → **Connection string**
2. Copy pooled URL with `?sslmode=require`

---

## Step 2 — Initialize Neon from your PC (once)

**Done** for project `smartrack` on Neon — tables and test users are ready.

To re-run locally if needed:

```powershell
cd C:\Users\carlo\OneDrive\Desktop\smartrack\backend
# Paste connection string from Neon console → Connection details → Pooled
$env:DATABASE_URL = "postgresql://..."
npm run setup:cloud
```

Admin: `admin@smartrack.com` / `admin123`

---

## Step 3 — Push `render.yaml` to GitHub

Render reads the blueprint from your repo. Commit and push first:

```powershell
cd C:\Users\carlo\OneDrive\Desktop\smartrack
git add render.yaml docs/RENDER_DEPLOY.md frontend/public/config.js docs/MOBILE_DEVELOPER_B.md
git commit -m "Add Render cloud API deployment config"
git push origin main
```

---

## Step 4 — Deploy on Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → sign up with **GitHub** (no card)
2. **New** → **Blueprint**
3. Connect repo `carlosdeo456/smartrack`
4. When asked for **`DATABASE_URL`**, paste from [Neon console](https://console.neon.tech) → project **smartrack** → **Connect** → **Pooled connection**
5. Click **Apply** / **Deploy**

**Manual alternative** (no blueprint): **New Web Service** → same repo → settings:

| Setting | Value |
|---------|--------|
| Name | `smartrack-api` |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Plan | **Free** |
| Health Check Path | `/health` |

Environment variables (if not using blueprint):

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | *(Neon pooled connection string)* |
| `JWT_SECRET` | *(same as local `.env` or any 32+ char secret)* |
| `JWT_EXPIRE` | `7d` |
| `CORS_ORIGINS` | `https://smartrack-806fb.web.app,https://smartrack-uxeb.vercel.app,https://smartrack-806fb.firebaseapp.com` |
| `ENABLE_SIMULATED_GPS` | `false` |

---

## Step 5 — Test

```
https://smartrack-api.onrender.com/health
```

Expect: `"db":"connected"`

---

## Step 6 — Update web + mobile

`frontend/public/config.js`:

```javascript
window.__SMARTRACK__ = {
  API_URL: 'https://smartrack-api.onrender.com',
  SOCKET_URL: 'https://smartrack-api.onrender.com',
};
```

```powershell
npm run deploy:firebase
cd frontend
npx vercel deploy --prod --yes
```

Mobile:
```bash
flutter build apk --release --dart-define=API_BASE_URL=https://smartrack-api.onrender.com
```

---

## Important: avoid payment prompts on Render

| Do | Don't |
|----|-------|
| Free **Web Service** plan | Paid plans |
| **Neon** for PostgreSQL | Render PostgreSQL (expires / needs upgrade) |
| Set `DATABASE_URL` env var manually | Add paid database add-on |

Render free tier does **not** require a credit card for web services.

---

## If you are OK adding a card

Fly.io (`docs/FLY_DEPLOY.md`) avoids cold starts and is faster when idle. Adding a card is for verification; you are not charged unless you exceed free allowance.
