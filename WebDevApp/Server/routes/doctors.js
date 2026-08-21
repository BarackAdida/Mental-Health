const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DB_PATH = path.join(__dirname, '../db/db.json');

const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must be logged in' });
  }
  next();
};

router.use(requireAuth);

router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.doctors);
});

router.get('/:id', (req, res) => {
  const db = readDB();
  const doctor = db.doctors.find(d => d.id === parseInt(req.params.id));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  res.json(doctor);
});

router.post('/', (req, res) => {
  const db = readDB();
  const newDoctor = {
    id: db.doctors.length ? Math.max(...db.doctors.map(d => d.id)) + 1 : 1,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const required = ['name', 'specialization', 'licenseNumber', 'phoneNumber', 'email'];
  const missing = required.filter(field => !newDoctor[field]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });
  }

  db.doctors.push(newDoctor);
  writeDB(db);
  res.status(201).json(newDoctor);
});

router.put('/:id', (req, res) => {
  const db = readDB();
  const index = db.doctors.findIndex(d => d.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Doctor not found' });

  const updated = {
    ...db.doctors[index],
    ...req.body,
    id: db.doctors[index].id,
    updatedAt: new Date().toISOString()
  };
  db.doctors[index] = updated;
  writeDB(db);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = readDB();
  const doctor = db.doctors.find(d => d.id === parseInt(req.params.id));
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  db.doctors = db.doctors.filter(d => d.id !== parseInt(req.params.id));
  writeDB(db);
  res.json({ message: 'Doctor deleted', id: parseInt(req.params.id) });
});

module.exports = router;