const express = require('express');
const pool = require('../db/config');

const router = express.Router();

// Helper to format database row to match openapi.yaml schema
const formatEvent = (row) => ({
  id: String(row.id),
  title: row.title,
  description: row.description || '',
  location: row.location || '',
  startTime: row.date || row.created_at,
  cancelled: Boolean(row.cancelled)
});

// GET /events - Get list of events (with optional ?after= query filter)
router.get('/', async (req, res) => {
  const { after } = req.query;

  if (after && isNaN(Date.parse(after))) {
    return res.status(400).json({ message: 'after must be a real date like 2026-08-31' });
  }

  try {
    let query = 'SELECT * FROM events';
    const values = [];

    if (after) {
      query += ' WHERE date >= $1';
      values.push(after);
    }
    query += ' ORDER BY id';

    const result = await pool.query(query, values);
    const events = result.rows.map(formatEvent);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// GET /events/:id - Get single event by ID
router.get('/:id', async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return res.status(404).json({ message: 'No event found with that id' });
  }

  try {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No event found with that id' });
    }
    res.json(formatEvent(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch event' });
  }
});

// POST /events - Create new event
router.post('/', async (req, res) => {
  const { title, location, startTime, description } = req.body;

  if (!title || !location || !startTime) {
    return res.status(400).json({ message: 'title, location, and startTime are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO events (title, location, date, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [title, location, startTime, description || null]
    );
    res.status(201).json(formatEvent(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

// PATCH /events/:id - Update event fields (including cancelled)
router.patch('/:id', async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return res.status(404).json({ message: 'No event found with that id' });
  }

  const { title, location, startTime, cancelled } = req.body;

  try {
    const exists = await pool.query('SELECT id FROM events WHERE id = $1', [eventId]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ message: 'No event found with that id' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      values.push(location);
    }
    if (startTime !== undefined) {
      updates.push(`date = $${paramIndex++}`);
      values.push(startTime);
    }
    if (cancelled !== undefined) {
      updates.push(`cancelled = $${paramIndex++}`);
      values.push(cancelled);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(eventId);
    const query = `
      UPDATE events
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    res.json(formatEvent(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update event' });
  }
});

// DELETE /events/:id - Delete an event
router.delete('/:id', async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return res.status(404).json({ message: 'No event found with that id' });
  }

  try {
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [eventId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No event found with that id' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

module.exports = router;