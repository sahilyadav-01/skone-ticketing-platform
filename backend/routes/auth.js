const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
// Body: { user_id } OR { username }
// In this project we keep login simple (no password verification yet) to support the demo.
router.post('/login', async (req, res) => {
  try {
    const { user_id, username } = req.body || {};

    let rows;
    if (user_id) {
      [rows] = await pool.query('SELECT user_id, username, email, role FROM users WHERE user_id = ?', [user_id]);
    } else if (username) {
      [rows] = await pool.query('SELECT user_id, username, email, role FROM users WHERE username = ?', [username]);
    } else {
      return res.status(400).json({ error: 'user_id or username is required' });
    }

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;

