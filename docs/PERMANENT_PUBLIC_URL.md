# Permanent public API URL for SmartTrack

SmartTrack needs a **stable HTTPS URL** for the backend so Vercel/Firebase/mobile can reach it from any network.

## Option A — Cloudflare Named Tunnel (recommended if you have a domain)

**Permanent URL example:** `https://api.yourdomain.com`  
**Cost:** Free (domain ~$10/year if you don't have one)  
**PC must stay on** with `npm run dev` + cloudflared service

### One-time setup

```powershell
cd C:\Users\carlo\OneDrive\Desktop\smartrack
powershell -ExecutionPolicy Bypass -File .\scripts\setup-permanent-tunnel.ps1
```

Follow prompts:
1. Installs `cloudflared`
2. Opens browser to log in to Cloudflare
3. Creates tunnel `smartrack-api`
4. You enter your domain (must be on Cloudflare DNS)
5. Creates DNS `api.yourdomain.com` → tunnel
6. Installs cloudflared as a **Windows service** (survives reboot)

### After setup

1. Update `frontend/public/config.js`:
   ```javascript
   API_URL: 'https://api.yourdomain.com',
   SOCKET_URL: 'https://api.yourdomain.com',
   ```
2. Add to `backend/.env` CORS_ORIGINS:
   ```
   https://api.yourdomain.com
   ```
3. Redeploy web:
   ```powershell
   npm run deploy:firebase
   cd frontend && npx vercel deploy --prod --yes
   ```

### Daily use

Only need:
```powershell
npm run dev
```
Tunnel runs automatically as a Windows service.

---

## Option B — Cloudflare quick tunnel (temporary — what you use now)

```powershell
npx cloudflared tunnel --url http://localhost:5000
```

**URL changes every restart** → causes "Failed to fetch". Not permanent.

---

## Option C — Host backend in the cloud (PC can be off)

Permanent URL like `https://smartrack-api.fly.dev` with no tunnel on your PC.

| Provider | Free tier | Notes |
|----------|-----------|-------|
| Fly.io | Yes (limits) | Good for Node + Socket.IO |
| Neon | Free Postgres | Use with Fly/Railway |
| Railway | Trial credits | Easy deploy |

Requires moving PostgreSQL off your PC.

---

## Architecture comparison

```
TEMPORARY (current problem):
  Web → random.trycloudflare.com → PC (URL dies when tunnel stops)

PERMANENT TUNNEL:
  Web → api.yourdomain.com → Cloudflare → PC (fixed URL, PC must run)

PERMANENT CLOUD:
  Web → api.fly.dev → cloud server (PC optional)
```

---

## Don't have a domain?

1. Buy one (Namecheap, Google Domains, etc.) and add it to Cloudflare (free)
2. Or use **Option C** (Fly.io `*.fly.dev` URL — no domain needed)
