const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const bcrypt = require('bcrypt');

// POST /api/auth/login
// Body: { identifier, password }
// identifier can be either email or username.
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};


    if (!identifier || !password) {
      return res.status(400).json({ error: 'identifier and password are required' });
    }

    const [rows] = await pool.query(
      'SELECT user_id, username, email, role, password_hash FROM users WHERE email = ? OR username = ?',
      [identifier, identifier]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { user_id: user.user_id, username: user.username, email: user.email, role: user.role } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});


module.exports = router;

