# TanzaParcel — Guide for Developer B (Mobile)

You build and distribute the **Flutter mobile app** on your machine.  
Developer A runs the **backend API** and shares a public URL. You do **not** need the full `smartrack` repo unless you also work on backend/web.

---

## Architecture

```
Your machine (Developer B)          Developer A's server PC
┌─────────────────────┐             ┌─────────────────────┐
│  TanzaParcel        │   HTTPS     │  smartrack backend  │
│  flutter build apk  │ ──────────► │  PostgreSQL         │
└─────────────────────┘             │  + Cloudflare tunnel│
                                    └─────────────────────┘

Phones (any network) install APK → call same public API URL as the web app.
```

---

## What Developer A gives you

Ask Developer A for the **current public API URL**. It must be HTTPS and reachable from the internet.

| Item | Current value (update when A says so) |
|------|----------------------------------------|
| **API base URL** | `https://lay-drugs-sterling-shame.trycloudflare.com` |
| **Health check** | `https://lay-drugs-sterling-shame.trycloudflare.com/health` |
| **Web app** | https://smartrack-806fb.web.app |
| **Test login** | `admin@smartrack.com` / `admin123` |

**Before you test or build**, open the health URL in a browser. You should see JSON with `"db":"connected"`.  
If it fails, Developer A must start `npm run dev` and the Cloudflare tunnel on their PC.

---

## Your machine — prerequisites

1. [Flutter SDK](https://docs.flutter.dev/get-started/install) installed
2. Android Studio (for Android SDK / emulator)
3. TanzaParcel project (git clone or zip from your team)
4. Optional: [Firebase CLI](https://firebase.google.com/docs/cli) for App Distribution

Verify:

```bash
flutter doctor
cd TanzaParcel
flutter pub get
```

---

## API URL in the app

TanzaParcel should read the API from a compile-time variable (typical pattern):

```dart
// lib/config/api_config.dart (or similar)
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:5000',
);
```

Always pass `API_BASE_URL` when running or building — see below.

**Do not use `localhost` on a physical phone** unless the backend runs on that same phone.

---

## Run on device / emulator

### Physical phone (any network — recommended)

Use Developer A's **public API URL**:

```bash
cd TanzaParcel
flutter run --dart-define=API_BASE_URL=https://lay-drugs-sterling-shame.trycloudflare.com
```

### Same office Wi‑Fi as Developer A (LAN test only)

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.32:5000
```

### Android Emulator (backend on Developer A's PC, you emulate locally)

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000
```

*(Only works if your emulator can reach A's machine on the LAN — usually not for remote developers.)*

---

## Build release APK

```bash
cd TanzaParcel
flutter build apk --release \
  --dart-define=API_BASE_URL=https://lay-drugs-sterling-shame.trycloudflare.com
```

Output:

```
build/app/outputs/flutter-apk/app-release.apk
```

When Developer A changes the tunnel URL, **rebuild** with the new `API_BASE_URL`.

---

## API endpoints the app uses

| Purpose | Method | Path |
|---------|--------|------|
| Health | GET | `/health` |
| Login | POST | `/api/auth/login` |
| Track shipment | GET | `/api/shipments/track/{trackingNumber}` |
| Latest GPS | GET | `/api/iot/gps/latest?trackingNumber=...` |

Base URL = `API_BASE_URL` (no `/api` suffix in the variable).

---

## Firebase App Distribution (share APK to testers)

### One-time setup

1. Developer A adds you to Firebase project **smartrack-806fb** (Editor role).
2. Firebase Console → **Add Android app** (if not done):
   - Package name = your `applicationId` from `android/app/build.gradle`
   - Download `google-services.json` → `android/app/google-services.json`
3. Enable **App Distribution** → create group `testers` → add tester emails.

### Upload from your machine

```bash
firebase login
firebase use smartrack-806fb

firebase appdistribution:distribute \
  build/app/outputs/flutter-apk/app-release.apk \
  --app "YOUR_FIREBASE_ANDROID_APP_ID" \
  --groups "testers" \
  --release-notes "TanzaParcel build"
```

`YOUR_FIREBASE_ANDROID_APP_ID` is in Firebase Console → Project settings → Your apps (format: `1:1053915092396:android:xxxxxxxx`).

### Or send APK to Developer A

Send `app-release.apk` via Drive/WhatsApp. A can upload using `smartrack/scripts/distribute-android-apk.ps1`.

---

## Checklist before each release

- [ ] Developer A confirmed API URL is live (`/health` returns `db: connected`)
- [ ] Built with correct `--dart-define=API_BASE_URL=...`
- [ ] Tested login and track flow on a real device
- [ ] Uploaded to App Distribution or shared APK with release notes

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Network request failed | Wrong API URL; tunnel down on A's PC; rebuild with new URL |
| Connection timeout | A's backend not running; firewall blocking port 5000 |
| Login works on web, not app | Rebuild APK with same API URL as web `config.js` |
| CORS errors | N/A on mobile — CORS is browser-only |
| `localhost` on phone | Use public HTTPS URL, not localhost |

---

## Contact Developer A when

- Health URL stops working
- You need a new test account or tracking number
- Tunnel URL changed (you must rebuild the APK)
- You need Firebase project access or `google-services.json`

---

## Reference (smartrack repo — optional)

Developer A's repo: `smartrack`  
More detail: `docs/FIREBASE_MOBILE.md`, `docs/DECOUPLED_API_SETUP.md`
