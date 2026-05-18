const express = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/assets?q=search
// Clients see only their assets; support/admin see all
router.get('/', requireRole(['Client', 'Support Engineer', 'Admin']), async (req, res) => {
  try {
    const q = req.query.q ? `%${String(req.query.q)}%` : '%';
    const isClient = req.user.role === 'Client';
    let sql = `SELECT asset_id, name, client_id, deployment_date, status FROM assets WHERE name LIKE ?`;
    const params = [q];
    if (isClient) {
      sql += ' AND client_id = ?';
      params.push(req.user.user_id);
    }
    sql += ' ORDER BY name LIMIT 100';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load assets' });
  }
});

module.exports = router;
