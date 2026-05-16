const express = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// GET /api/tickets
// - Clients: only tickets for themselves via ?client_id=<their id>
// - Support Engineer/Admin: can view all tickets with optional filters
router.get('/', requireRole(['Client', 'Support Engineer', 'Admin']), async (req, res) => {
  try {
    const { client_id, status, assigned_tech } = req.query;

    const where = { client_id: null, status: null, assigned_tech: null };
    if (status) where.status = status;
    if (assigned_tech) where.assigned_tech = assigned_tech;

    // If client, force client_id match
    if (req.user.role === 'Client') {
      where.client_id = req.user.user_id;
    } else {
      // support/admin: allow optional client_id filter
      where.client_id = client_id ? client_id : null;
    }

    let whereClause = '';
    let params = [];

    if (where.client_id !== null) {
      whereClause += ' AND t.client_id = ?';
      params.push(where.client_id);
    }
    if (where.status !== null) {
      whereClause += ' AND t.status = ?';
      params.push(where.status);
    }
    if (where.assigned_tech !== null) {
      whereClause += ' AND t.assigned_tech = ?';
      params.push(where.assigned_tech);
    }

    if (whereClause.startsWith(' AND ')) {
      whereClause = ' WHERE ' + whereClause.substring(5);
    }

    const [rows] = await pool.query(
      `SELECT t.ticket_id, t.client_id, t.asset_id, t.issue_type, t.error_code, t.status, t.assigned_tech, t.description, t.created_at
       FROM tickets t${whereClause}
       ORDER BY t.created_at DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load tickets' });
  }
});



router.post('/', requireRole(['Client']), async (req, res) => {
  const { client_id, asset_id, issue_type, error_code, status, assigned_tech, description } = req.body;

  // Client can only create tickets for themselves
  if (!client_id || !issue_type || !description) {
    return res.status(400).json({ error: 'client_id, issue_type, and description are required' });
  }
  if (Number(client_id) !== Number(req.user.user_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }


  const mapped_issue_type = issue_type;



  try {
    const [result] = await pool.query(
'INSERT INTO tickets (client_id, asset_id, issue_type, error_code, status, assigned_tech, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [client_id, asset_id || null, mapped_issue_type, error_code || null, status || 'Open', assigned_tech || null, description]
    );

    const [rows] = await pool.query('SELECT * FROM tickets WHERE ticket_id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.patch('/:ticket_id', requireRole(['Support Engineer', 'Admin']), async (req, res) => {
  const { ticket_id } = req.params;
  const { status, assigned_tech, description } = req.body;


  const updates = [];
  const params = [];

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }

  if (assigned_tech !== undefined) {
    updates.push('assigned_tech = ?');
    params.push(assigned_tech);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields provided to update.' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE ticket_id = ?`,
      [...params, ticket_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const [rows] = await pool.query('SELECT * FROM tickets WHERE ticket_id = ?', [ticket_id]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

module.exports = router;

