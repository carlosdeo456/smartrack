function getPoolConfig() {
  const connectionString = process.env.DATABASE_URL;
  const config = { connectionString };

  const useSsl =
    process.env.NODE_ENV === 'production' ||
    process.env.PGSSL === 'true' ||
    /render\.com|neon\.tech|supabase|amazonaws\.com/i.test(connectionString || '');

  if (useSsl) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

module.exports = { getPoolConfig };
