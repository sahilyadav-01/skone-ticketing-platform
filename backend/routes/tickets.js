const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { client_id, status, assigned_tech } = req.query;

    let whereClause = '';
    let params = [];

    if (client_id) {
      whereClause += ' AND t.client_id = ?';
      params.push(client_id);
    }

    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    if (assigned_tech) {
      whereClause += ' AND t.assigned_tech = ?';
      params.push(assigned_tech);
    }

    // Remove leading ' AND ' if no filters
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


router.post('/', async (req, res) => {
  const { client_id, asset_id, issue_type, error_code, status, assigned_tech, description } = req.body;

  if (!client_id || !issue_type || !description) {
    return res.status(400).json({ error: 'client_id, issue_type, and description are required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO tickets (client_id, asset_id, issue_type, error_code, status, assigned_tech, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [client_id, asset_id || null, issue_type, error_code || null, status || 'Open', assigned_tech || null, description]
    );

    const [rows] = await pool.query('SELECT * FROM tickets WHERE ticket_id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.patch('/:ticket_id', async (req, res) => {
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

