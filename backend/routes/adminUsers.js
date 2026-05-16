const express = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(['Admin']));

// GET /api/admin/users
router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    if (role) {
      const allowed = ['Client', 'Support Engineer', 'Admin'];
      if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });
      const [rows] = await pool.query(
        'SELECT user_id, username, email, role FROM users WHERE role = ? ORDER BY user_id DESC',
        [role]
      );
      return res.json(rows);
    }

    const [rows] = await pool.query(
      'SELECT user_id, username, email, role FROM users ORDER BY user_id DESC'
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// POST /api/admin/users
// Body: { username, email, password_hash, role }
router.post('/', async (req, res) => {
  try {
    const { username, email, password_hash, role } = req.body || {};
    if (!username || !email || !password_hash || !role) {
      return res.status(400).json({ error: 'username, email, password_hash, role are required' });
    }

    const allowed = ['Client', 'Support Engineer', 'Admin'];
    if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, password_hash, role]
    );

    const insertId = result[0]?.insertId;

    const [rows] = await pool.query('SELECT user_id, username, email, role FROM users WHERE user_id = ?', [insertId]);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/admin/users/:user_id
router.patch('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { username, email, password_hash, role } = req.body || {};

    const updates = [];
    const params = [];

    if (username !== undefined) {
      updates.push('username = ?');
      params.push(username);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (password_hash !== undefined) {
      updates.push('password_hash = ?');
      params.push(password_hash);
    }
    if (role !== undefined) {
      const allowed = ['Client', 'Support Engineer', 'Admin'];
      if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields provided' });

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
      [...params, user_id]
    );

    const affected = result[0]?.affectedRows;
    if (!affected) return res.status(404).json({ error: 'User not found' });

    const [rows] = await pool.query('SELECT user_id, username, email, role FROM users WHERE user_id = ?', [user_id]);
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:user_id
router.delete('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE user_id = ?', [user_id]);
    const affected = result[0]?.affectedRows;
    if (!affected) return res.status(404).json({ error: 'User not found' });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;

