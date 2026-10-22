const express = require('express');
const pool = require('../db/config');
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'You must be logged in' });
  next();
};
router.use(requireAuth);

const mapAppointment = (row) => ({
  id: row.id,
  type: row.type,
  doctorId: row.doctor_id,
  doctorName: row.doctor_name,
  doctorSpecialization: row.doctor_specialization,
  serviceName: row.service_name,
  providerName: row.provider_name,
  scheduledAt: row.scheduled_at,
  reason: row.reason,
  status: row.status,
  createdAt: row.created_at,
});

const SELECT_QUERY = `
  SELECT a.*, 
         d.name AS doctor_name, 
         d.specialization AS doctor_specialization
  FROM appointments a
  LEFT JOIN doctors d ON d.id = a.doctor_id
`;

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
    if (type === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE id = $1', [doctorId]);
      if (!doc.rows.length) return res.status(404).json({ error: 'Doctor not found' });
    }

    const inserted = await pool.query(
      `INSERT INTO appointments (user_id, type, doctor_id, service_name, provider_name, scheduled_at, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [req.session.userId, type || 'doctor', doctorId || null, serviceName || null, providerName || null, when.toISOString(), reason || null]
    );

    const joined = await pool.query(`${SELECT_QUERY} WHERE a.id = $1`, [inserted.rows[0].id]);
    res.status(201).json(mapAppointment(joined.rows[0]));
  } catch (err) {
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