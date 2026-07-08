const { Pool } = require('pg');
const { getPoolConfig } = require('./poolConfig');

const pool = new Pool(getPoolConfig());

pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

module.exports = pool;
