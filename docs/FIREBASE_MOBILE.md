# Host / distribute SmartTrack mobile app on Firebase

Firebase **cannot** host a native Android/iOS app like a website. It offers two useful options:

| Goal | Firebase product | Result |
|------|------------------|--------|
| Share APK with testers (phones) | **App Distribution** | Install link / email invite |
| Mobile-style app in browser | **Hosting** + Flutter Web | `https://smartrack-806fb.web.app` |
| Play Store release | **Google Play Console** | Not Firebase (separate) |

Your **API backend** stays separate (PC + tunnel or cloud). Firebase only hosts the **app file** or **web build**.

---

## Option 1 — Firebase App Distribution (recommended for Flutter APK)

Best for: customers/testers install the **real mobile app** on Android from any network.

### Step 1 — Register Android app in Firebase

1. Open [Firebase Console → smartrack-806fb](https://console.firebase.google.com/project/smartrack-806fb/overview)
2. Click **Add app** → **Android**
3. **Android package name** — from your Flutter project `android/app/build.gradle`:
   ```gradle
   applicationId "com.example.tanzaparcel"   // use YOUR real package name
   ```
4. Download `google-services.json` → place in:
   ```
   your-flutter-project/android/app/google-services.json
   ```

### Step 2 — Build APK with API URL

In your **Flutter project folder** (not smartrack web repo):

```powershell
cd PATH\TO\YOUR\FLUTTER\APP
flutter pub get

# Use your public API URL (tunnel or permanent domain)
flutter build apk --release --dart-define=API_BASE_URL=https://lay-drugs-sterling-shame.trycloudflare.com
```

APK output:
```
build/app/outputs/flutter-apk/app-release.apk
```

### Step 3 — Create tester group

Firebase Console → **App Distribution** → **Testers & Groups** → Create group `testers` → add emails.

### Step 4 — Upload APK

```powershell
cd C:\Users\carlo\OneDrive\Desktop\smartrack

# Get App ID from: Firebase Console → Project settings → Your apps → App ID
# Looks like: 1:1053915092396:android:xxxxxxxx

npx firebase appdistribution:distribute "PATH\TO\app-release.apk" `
  --app "YOUR_FIREBASE_ANDROID_APP_ID" `
  --groups "testers" `
  --release-notes "SmartTrack mobile beta"
```

Testers get an email with an install link.

### Or use the helper script

```powershell
.\scripts\distribute-android-apk.ps1 -ApkPath "C:\path\to\app-release.apk" -AppId "1:1053915092396:android:xxxxx"
```

---

## Option 2 — Flutter Web on Firebase Hosting

Best for: open the app in a **mobile browser** without installing APK.

```powershell
cd PATH\TO\YOUR\FLUTTER\APP
flutter build web --dart-define=API_BASE_URL=https://YOUR-API-URL

# Copy build output to smartrack or deploy separately
firebase hosting:channel:deploy mobile --only hosting
```

Note: GPS, some plugins, and native features may not work on web.

---

## Architecture (any network)

```
┌─────────────────────┐
│  Flutter APK        │  Firebase App Distribution (install link)
│  (on phone)         │
└──────────┬──────────┘
           │  HTTPS API
           ▼
┌─────────────────────┐
│  Backend API        │  tunnel or permanent URL
│  + PostgreSQL       │
└─────────────────────┘

┌─────────────────────┐
│  React web          │  Firebase Hosting (already live)
│  smartrack-806fb    │  https://smartrack-806fb.web.app
└─────────────────────┘
```

---

## API URL for mobile (must match web)

Update when tunnel changes. Use the same URL in:

- `flutter build apk --dart-define=API_BASE_URL=...`
- `frontend/public/config.js` (web)

Current (temporary tunnel — change when it expires):
```
https://lay-drugs-sterling-shame.trycloudflare.com
```

---

## What you need from me to finish setup

1. **Path to your Flutter project** (TanzaParcel folder)
2. **Android package name** (`applicationId` in `build.gradle`)
3. After you register the app in Firebase, the **App ID** (`1:1053915092396:android:...`)

Then we can wire `google-services.json`, build script, and one-command deploy.

---

## Do NOT use

- `firebase init` → App Hosting (for Next.js SSR, not Flutter APK)
- Firebase Hosting alone for APK files (Hosting is for HTML/JS, not Play Store installs)
- Vercel for mobile APK
