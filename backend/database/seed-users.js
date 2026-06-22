require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

const TEST_USERS = [
  { email: 'admin@smartrack.com', password: 'admin123', fullName: 'Admin User', role: 'admin' },
  { email: 'driver@smartrack.com', password: 'driver123', fullName: 'John Driver', role: 'driver' }
];

async function seedUsers() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const driverHash = await bcrypt.hash('driver123', 10);
  const hashes = { 'admin@smartrack.com': passwordHash, 'driver@smartrack.com': driverHash };

  for (const user of TEST_USERS) {
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role`,
      [user.email, hashes[user.email], user.fullName, user.role]
    );
  }

  console.log('Test users ready:');
  console.log('  admin@smartrack.com / admin123');
  console.log('  driver@smartrack.com / driver123');
  await pool.end();
}

seedUsers().catch((err) => {
  console.error('Failed to seed users:', err.message);
  process.exit(1);
});
