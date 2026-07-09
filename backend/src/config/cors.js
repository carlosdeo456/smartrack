const { CORS_ORIGINS, CORS_ORIGIN, CORS_ALLOW_ALL, isProduction } = require('./env');

/** Hosted frontends — always allowed in production even if env vars are missing on Render. */
const HOSTED_ORIGINS = [
  'https://smartrack-806fb.web.app',
  'https://smartrack-806fb.firebaseapp.com',
  'https://smartrack-uxeb.vercel.app',
];

/**
 * CORS for SmrtTrack (React on A) + Tanza Parcel (Flutter on B over Wi-Fi).
 *
 * Local LAN testing:
 *   CORS_ALLOW_ALL=true          → allow any browser origin (dev only)
 *   CORS_ORIGINS=http://192.168.1.20:3000  → Developer B or other web clients
 *
 * Mobile Flutter apps typically send no Origin header and are always allowed.
 */
function buildAllowedOrigins() {
  const fromList = (CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    CORS_ORIGIN,
    ...(isProduction ? HOSTED_ORIGINS : []),
  ].filter(Boolean);

  return [...new Set([...fromList, ...defaults])];
}

function isHostedFrontendOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  // Firebase / Vercel production + preview URLs for this project
  if (/^https:\/\/smartrack(-uxeb)?[a-z0-9-]*\.vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/smartrack-uxeb-[a-z0-9-]+-carlosdeo456s-projects\.vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/smartrack-[a-z0-9]+\.web\.app$/i.test(origin)) return true;
  if (/^https:\/\/smartrack-[a-z0-9]+\.firebaseapp\.com$/i.test(origin)) return true;
  return false;
}

function corsOptions() {
  const allowedOrigins = buildAllowedOrigins();

  // Cloud hosts (Render, etc.) — allow all browser origins so Firebase/Vercel always work
  if (isProduction) {
    return {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    };
  }

  // Dev-only wildcard
  if (CORS_ALLOW_ALL && !isProduction) {
    return {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    };
  }

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (isProduction && isHostedFrontendOrigin(origin)) return callback(null, true);
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
}

module.exports = { corsOptions, buildAllowedOrigins, isHostedFrontendOrigin };
