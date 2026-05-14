const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { client_id } = req.query;

    const [rows] = client_id
      ? await pool.query(
          `SELECT t.ticket_id, t.client_id, t.asset_id, t.issue_type, t.error_code, t.status, t.assigned_tech, t.description, t.created_at
           FROM tickets t
           WHERE t.client_id = ?
           ORDER BY t.created_at DESC`,
          [client_id]
        )
      : await pool.query(
          `SELECT t.ticket_id, t.client_id, t.asset_id, t.issue_type, t.error_code, t.status, t.assigned_tech, t.description, t.created_at
           FROM tickets t
           ORDER BY t.created_at DESC`
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

module.exports = router;
