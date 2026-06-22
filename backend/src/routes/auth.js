const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
}

function formatUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    phone: row.phone,
    company: row.company
  };
}

router.post('/register', async (req, res) => {
  const { email, password, fullName, full_name, role, phone, company } = req.body;
  const name = fullName || full_name;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const userRole = role || 'customer';
  if (!['admin', 'driver', 'customer'].includes(userRole)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone, company)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, phone, company`,
      [email.toLowerCase(), passwordHash, name, userRole, phone || null, company || null]
    );

    const user = result.rows[0];
    res.status(201).json({ token: createToken(user), user: formatUser(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw err;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const result = await pool.query(
    `SELECT id, email, password_hash, full_name, role, phone, company, is_active
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = result.rows[0];

  if (!user.is_active) {
    return res.status(403).json({ error: 'Account is disabled' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({ token: createToken(user), user: formatUser(user) });
});

router.get('/me', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, email, full_name, role, phone, company
     FROM users WHERE id = $1`,
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: formatUser(result.rows[0]) });
});

module.exports = router;
