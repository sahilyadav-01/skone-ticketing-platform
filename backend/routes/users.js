const express = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/users?role=Client
// Admin only (Support Engineer cannot enumerate users)
router.get('/', requireRole(['Admin']), async (req, res) => {
  try {
    const { role } = req.query;
    const allowedRoles = ['Client', 'Support Engineer', 'Admin'];

    const safeRole = role && allowedRoles.includes(role) ? role : null;

    const [rows] = await pool.query(
      safeRole
        ? 'SELECT user_id, username, email, role FROM users WHERE role = ? ORDER BY user_id DESC'
        : 'SELECT user_id, username, email, role FROM users ORDER BY user_id DESC',
      safeRole ? [safeRole] : []
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

module.exports = router;


