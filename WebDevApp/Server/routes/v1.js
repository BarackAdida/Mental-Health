const express = require('express');
const pool = require('../db/config');
const { deprecated } = require('../deprecate');

const router = express.Router();
const old = deprecated({ sunset: '2026-11-20', successor: '/api/v2/events' });
router.use(old);

const toPublicId = (n) => `evt_${n}`;

const parseId = (raw) => {
  const m = /^(?:evt_)?(\d{1,9})$/.exec(String(raw));
  return m ? parseInt(m[1], 10) : null;
};

const serialize = (r) => ({
  id: toPublicId(r.id),
  title: r.title,
  description: r.description,
  location: r.location,
  startTime: new Date(r.start_time).toISOString(),
  cancelled: r.cancelled,
  ...(r.saved_at ? { savedAt: r.saved_at } : {}),
});

const isRealDateTime = (v) => typeof v === 'string' && !isNaN(Date.parse(v));
const isRealDate = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !isNaN(d) && d.toISOString().slice(0, 10) === v;
};

const notFound = (res) => res.status(404).json({ message: 'No event found with that id' });

const serverError = (res, err, msg) => {
  console.error(err);
  res.status(500).json({ message: msg });
};

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Not authenticated' });
  next();
};

const requireAdmin = async (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ message: 'You must be logged in' });
  try {
    const r = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.session.userId]);
    if (!r.rows[0] || !r.rows[0].is_admin) return res.status(403).json({ message: 'Admin access required' });
    next();
  } catch (err) {
    serverError(res, err, 'Internal server error');
  }
};

router.get('/', async (req, res) => {
  const { after } = req.query;
  try {
    let result;
    if (after !== undefined) {
      if (typeof after !== 'string' || !isRealDate(after)) {
        return res.status(400).json({ message: 'after must be a real date like 2026-08-31' });
      }
      result = await pool.query(
        `SELECT * FROM events WHERE start_time >= ($1::date::timestamp AT TIME ZONE 'UTC') ORDER BY start_time, id`,
        [after]
      );
    } else {
      result = await pool.query('SELECT * FROM events ORDER BY start_time, id');
    }
    res.json(result.rows.map(serialize));
  } catch (err) {
    serverError(res, err, 'Failed to fetch events');
  }
});

router.get('/saved', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, us.saved_at FROM events e JOIN user_saved_events us ON e.id = us.event_id WHERE us.user_id = $1 ORDER BY us.saved_at DESC`,
      [req.session.userId]
    );
    res.json(result.rows.map(serialize));
  } catch (err) {
    serverError(res, err, 'Failed to fetch saved events');
  }
});

router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return notFound(res);
  try {
    const r = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    if (!r.rows.length) return notFound(res);
    res.json(serialize(r.rows[0]));
  } catch (err) {
    serverError(res, err, 'Failed to fetch event');
  }
});

router.post('/:id/save', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return notFound(res);
  try {
    const e = await pool.query('SELECT id FROM events WHERE id = $1', [id]);
    if (!e.rows.length) return notFound(res);
    await pool.query(
      `INSERT INTO user_saved_events (user_id, event_id) VALUES ($1, $2) ON CONFLICT (user_id, event_id) DO NOTHING`,
      [req.session.userId, id]
    );
    res.json({ message: 'Event saved successfully', eventId: toPublicId(id) });
  } catch (err) {
    serverError(res, err, 'Failed to save event');
  }
});

router.delete('/:id/save', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return notFound(res);
  try {
    const r = await pool.query(
      'DELETE FROM user_saved_events WHERE user_id = $1 AND event_id = $2 RETURNING *',
      [req.session.userId, id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Saved event not found' });
    res.json({ message: 'Event unsaved successfully', eventId: toPublicId(id) });
  } catch (err) {
    serverError(res, err, 'Failed to unsave event');
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const { title, description, location, startTime } = req.body || {};
  if (!title || !location || !startTime || typeof title !== 'string' || typeof location !== 'string') {
    return res.status(400).json({ message: 'title, location and startTime are required' });
  }
  if (!isRealDateTime(startTime)) {
    return res.status(400).json({ message: 'startTime must be a valid date-time like 2026-09-20T17:00:00Z' });
  }
  try {
    const r = await pool.query(
      `INSERT INTO events (title, description, location, start_time, cancelled) VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
      [title, description || null, location, startTime]
    );
    res.status(201).json(serialize(r.rows[0]));
  } catch (err) {
    serverError(res, err, 'Failed to create event');
  }
});

const updateEvent = async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return notFound(res);
  const { title, description, location, startTime, cancelled } = req.body || {};

  if (title !== undefined && (typeof title !== 'string' || !title)) {
    return res.status(400).json({ message: 'title must be a non-empty string' });
  }
  if (location !== undefined && (typeof location !== 'string' || !location)) {
    return res.status(400).json({ message: 'location must be a non-empty string' });
  }
  if (startTime !== undefined && !isRealDateTime(startTime)) {
    return res.status(400).json({ message: 'startTime must be a valid date-time like 2026-09-20T17:00:00Z' });
  }
  if (cancelled !== undefined && typeof cancelled !== 'boolean') {
    return res.status(400).json({ message: 'cancelled must be true or false' });
  }

  const sets = [];
  const vals = [];
  const add = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  if (title !== undefined) add('title', title);
  if (description !== undefined) add('description', description);
  if (location !== undefined) add('location', location);
  if (startTime !== undefined) add('start_time', startTime);
  if (cancelled !== undefined) add('cancelled', cancelled);
  if (!sets.length) return res.status(400).json({ message: 'No fields to update' });
  sets.push('updated_at = NOW()');

  try {
    vals.push(id);
    const r = await pool.query(`UPDATE events SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
    if (!r.rows.length) return notFound(res);
    res.json(serialize(r.rows[0]));
  } catch (err) {
    serverError(res, err, 'Failed to update event');
  }
};

router.patch('/:id', requireAdmin, updateEvent);
router.put('/:id', requireAdmin, updateEvent);

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return notFound(res);
  try {
    const r = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
    if (!r.rows.length) return notFound(res);
    res.status(204).end();
  } catch (err) {
    serverError(res, err, 'Failed to delete event');
  }
});

module.exports = router;