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

const mapDoctor = (row) => ({
  id: row.id,
  name: row.name,
  specialization: row.specialization,
  licenseNumber: row.license_number,
  phoneNumber: row.phone_number,
  email: row.email,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doctors ORDER BY id');
    res.json(result.rows.map(mapDoctor));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM doctors WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Doctor not found' });
    res.json(mapDoctor(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

router.post('/', async (req, res) => {
  const { name, specialization, licenseNumber, phoneNumber, email } = req.body;
  const required = [name, specialization, licenseNumber, phoneNumber, email];
  
  if (required.includes(undefined) || required.includes('')) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO doctors (name, specialization, license_number, phone_number, email) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, specialization, licenseNumber, phoneNumber, email]
    );
    res.status(201).json(mapDoctor(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create doctor' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, specialization, licenseNumber, phoneNumber, email } = req.body;
  try {
    const result = await pool.query(
      `UPDATE doctors 
       SET name = COALESCE($1, name), 
           specialization = COALESCE($2, specialization), 
           license_number = COALESCE($3, license_number), 
           phone_number = COALESCE($4, phone_number), 
           email = COALESCE($5, email),
           updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name, specialization, licenseNumber, phoneNumber, email, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Doctor not found' });
    res.json(mapDoctor(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update doctor' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM doctors WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ message: 'Doctor deleted', id: Number(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
});

module.exports = router;