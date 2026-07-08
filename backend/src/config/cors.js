const { CORS_ORIGINS, CORS_ORIGIN, CORS_ALLOW_ALL, isProduction } = require('./env');

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
  ].filter(Boolean);

  return [...new Set([...fromList, ...defaults])];
}

function corsOptions() {
  const allowedOrigins = buildAllowedOrigins();

  // Dev-only wildcard — never enable in production
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
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
}

module.exports = { corsOptions, buildAllowedOrigins };
