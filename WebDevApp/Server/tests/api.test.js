const request = require('supertest');
const app = require('../app');

describe('Events Endpoint Tests', () => {

  // 1. Happy Path
  it('GET /api/events - returns event list', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // 2. Not Found Case
  it('GET /api/events/99999 - returns 404 for non-existent event ID', async () => {
    const res = await request(app).get('/api/events/99999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  // 3. Invalid/Non-existent String ID
  it('GET /api/events/invalid-id - handles non-existent resource', async () => {
    const res = await request(app).get('/api/events/invalid-id');
    expect([400, 404]).toContain(res.status);
    expect(res.body).toHaveProperty('message');
  });

});

describe('Auth Endpoint Tests', () => {

  // 4. Auth Validation Rejection
  it('POST /api/auth/login - fails when missing credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect([400, 401, 422]).toContain(res.status);
  });

});