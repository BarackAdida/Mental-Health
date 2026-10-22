const express = require('express');
const pool = require('../db/config');

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in' });
  }
  next();
};

router.use(requireAuth);

const mapAppointment = (row) => ({
  id: row.id,
  doctorId: row.doctor_id,
  doctorName: row.doctor_name,
  doctorSpecialization: row.doctor_specialization,
  scheduledAt: row.scheduled_at,
  reason: row.reason,
  status: row.status,
  createdAt: row.created_at,
});

const SELECT_WITH_DOCTOR = `
  SELECT a.*, d.name AS doctor_name, d.specialization AS doctor_specialization
  FROM appointments a
  JOIN doctors d ON d.id = a.doctor_id
`;

// List the logged-in user's appointments (used by Dashboard).
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_WITH_DOCTOR}
       WHERE a.user_id = $1
       ORDER BY a.scheduled_at DESC`,
      [req.session.userId]
    );
    res.json(result.rows.map(mapAppointment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Book a new appointment.
router.post('/', async (req, res) => {
  const { doctorId, scheduledAt, reason } = req.body;

  if (!doctorId || !scheduledAt) {
    return res.status(400).json({ error: 'Doctor and scheduled time are required' });
  }

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) {
    return res.status(400).json({ error: 'Invalid scheduled time' });
  }

  try {
    const doc = await pool.query('SELECT id FROM doctors WHERE id = $1', [doctorId]);
    if (!doc.rows.length) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const inserted = await pool.query(
      `INSERT INTO appointments (user_id, doctor_id, scheduled_at, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [req.session.userId, doctorId, when.toISOString(), reason || null]
    );

    const joined = await pool.query(
      `${SELECT_WITH_DOCTOR} WHERE a.id = $1`,
      [inserted.rows[0].id]
    );

    res.status(201).json(mapAppointment(joined.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Cancel an appointment (only the owner can).
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM appointments WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.session.userId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json({ message: 'Appointment cancelled', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

module.exports = router;