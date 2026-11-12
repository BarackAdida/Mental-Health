const express = require('express');
const pool = require('../db/config');
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'You must be logged in' });
  next();
};

const requireDoctor = (req, res, next) => {
  if (!req.session.doctorId) return res.status(401).json({ error: 'Doctor access required' });
  next();
};

const mapAppointment = (row) => ({
  id: row.id,
  type: row.type,
  doctorId: row.doctor_id,
  doctorName: row.doctor_name,
  serviceName: row.service_name,
  providerName: row.provider_name,
  scheduledAt: row.scheduled_at,
  reason: row.reason,
  status: row.status,
  createdAt: row.created_at,
});

const SELECT_QUERY = `
  SELECT a.*, d.name AS doctor_name 
  FROM appointments a
  LEFT JOIN doctors d ON d.id = a.doctor_id
`;

router.get('/doctor', requireDoctor, async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_QUERY} WHERE a.doctor_id = $1 ORDER BY a.scheduled_at ASC`,
      [req.session.doctorId]
    );
    res.json(result.rows.map(mapAppointment));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`${SELECT_QUERY} WHERE a.user_id = $1 ORDER BY a.scheduled_at DESC`, [req.session.userId]);
    res.json(result.rows.map(mapAppointment));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

router.post('/', async (req, res) => {
  const { type, doctorId, serviceName, providerName, scheduledAt, reason } = req.body;

  if (!scheduledAt || (!doctorId && !serviceName)) {
    return res.status(400).json({ error: 'Missing required booking details' });
  }

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) return res.status(400).json({ error: 'Invalid time' });

  try {
    if (doctorId) {
      const doc = await pool.query('SELECT id FROM doctors WHERE id = $1 AND is_active = TRUE', [doctorId]);
      if (!doc.rows.length) return res.status(404).json({ error: 'Doctor not found' });

      const countCheck = await pool.query(
        "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND status = 'scheduled'",
        [doctorId]
      );
      if (parseInt(countCheck.rows[0].count) >= 5) {
        return res.status(400).json({ error: 'Doctor has reached the maximum of 5 appointments' });
      }

      const timeCheck = await pool.query(
        "SELECT id FROM appointments WHERE doctor_id = $1 AND scheduled_at = $2 AND status = 'scheduled'",
        [doctorId, when.toISOString()]
      );
      if (timeCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Doctor is already booked at this time' });
      }
    }

    const inserted = await pool.query(
      `INSERT INTO appointments (user_id, type, doctor_id, service_name, provider_name, scheduled_at, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [req.session.userId, type || 'doctor', doctorId || null, serviceName || null, providerName || null, when.toISOString(), reason || null]
    );

    const joined = await pool.query(`${SELECT_QUERY} WHERE a.id = $1`, [inserted.rows[0].id]);
    res.status(201).json(mapAppointment(joined.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Doctor is already booked at this time' });
    }
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM appointments WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.session.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Cancelled', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

module.exports = router;