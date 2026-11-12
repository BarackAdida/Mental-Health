const express = require('express');
const pool = require('../db/config');

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in' });
  }
  next();
};

const requireDoctor = (req, res, next) => {
  if (!req.session.doctorId) {
    return res.status(401).json({ error: 'Doctor access required' });
  }
  next();
};

const mapDoctor = (row, isAdmin) => {
  const doc = {
    id: row.id,
    name: row.name,
    specialization: row.specialization,
    isAvailable: row.is_available,
    rating: row.rating ? Number(row.rating) : null,
    partnerId: row.partner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  
  if (isAdmin) {
    doc.licenseNumber = row.license_number;
    doc.phoneNumber = row.phone_number;
    doc.email = row.email;
  }
  
  return doc;
};

router.post('/login', async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'ID and Name required' });
  
  try {
    const result = await pool.query(
      'SELECT * FROM doctors WHERE id = $1 AND LOWER(name) = LOWER($2) AND is_active = TRUE',
      [id, name]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    
    req.session.doctorId = result.rows[0].id;
    res.json({ message: 'Doctor logged in', doctor: mapDoctor(result.rows[0], true) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.session.user && req.session.user.is_admin;
    const result = await pool.query(
      'SELECT * FROM doctors WHERE is_active = TRUE ORDER BY rating DESC NULLS LAST, name ASC'
    );
    res.json(result.rows.map(row => mapDoctor(row, isAdmin)));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

router.get('/me', requireDoctor, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.session.doctorId]);
    res.json(mapDoctor(result.rows[0], true));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.patch('/availability', requireDoctor, async (req, res) => {
  const { isAvailable } = req.body;
  if (typeof isAvailable !== 'boolean') return res.status(400).json({ error: 'isAvailable must be boolean' });
  
  try {
    const result = await pool.query(
      'UPDATE doctors SET is_available = $1 WHERE id = $2 RETURNING *',
      [isAvailable, req.session.doctorId]
    );
    res.json(mapDoctor(result.rows[0], true));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

router.get('/:id/reviews', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as patient_name FROM doctor_reviews r 
       JOIN users u ON u.id = r.patient_id 
       WHERE r.doctor_id = $1 ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/:id/reviews', requireAuth, async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });

  try {
    await pool.query(
      'INSERT INTO doctor_reviews (doctor_id, patient_id, rating, comment) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.session.userId, rating, comment || null]
    );

    const avg = await pool.query(
      'SELECT AVG(rating) as avg_rating FROM doctor_reviews WHERE doctor_id = $1',
      [req.params.id]
    );
    
    await pool.query(
      'UPDATE doctors SET rating = $1 WHERE id = $2',
      [avg.rows[0].avg_rating, req.params.id]
    );

    res.status(201).json({ message: 'Review added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add review' });
  }
});

module.exports = router;