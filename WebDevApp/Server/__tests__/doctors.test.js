const express = require('express');
const request = require('supertest');
const pool = require('../db/config');
const doctorsRouter = require('../routes/doctors');

jest.mock('../db/config', () => ({
  query: jest.fn(),
}));

const doctorRow = {
  id: 4,
  name: 'Dr. Example',
  specialization: 'Counseling',
  license_number: 'LICENSE-PRIVATE',
  phone_number: '555-0100',
  email: 'doctor@example.test',
  is_available: true,
  rating: '4.5',
  partner_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

const makeApp = ({ userId = 1, isAdmin = false } = {}) => {
  const app = express();
  app.use((req, res, next) => {
    req.session = userId ? { userId, user: { is_admin: isAdmin } } : {};
    next();
  });
  app.use('/api/doctors', doctorsRouter);
  return app;
};

beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockResolvedValue({ rows: [doctorRow] });
});

test('doctor directory hides contact and license details from regular users', async () => {
  const res = await request(makeApp()).get('/api/doctors');

  expect(res.status).toBe(200);
  expect(res.body[0]).toMatchObject({
    id: 4,
    name: 'Dr. Example',
    specialization: 'Counseling',
  });
  expect(res.body[0]).not.toHaveProperty('phoneNumber');
  expect(res.body[0]).not.toHaveProperty('email');
  expect(res.body[0]).not.toHaveProperty('licenseNumber');
});

test('admin doctor directory includes contact and license details', async () => {
  const res = await request(makeApp({ isAdmin: true })).get('/api/doctors');

  expect(res.status).toBe(200);
  expect(res.body[0]).toMatchObject({
    phoneNumber: '555-0100',
    email: 'doctor@example.test',
    licenseNumber: 'LICENSE-PRIVATE',
  });
});

test('doctor directory requires a signed-in user', async () => {
  const res = await request(makeApp({ userId: null })).get('/api/doctors');

  expect(res.status).toBe(401);
});
