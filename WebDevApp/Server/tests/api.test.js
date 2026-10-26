process.env.API_KEYS = 'jest:jest-test-key'; // must be set before ../app is loaded
const KEY = { 'X-API-Key': 'jest-test-key' };
const request = require('supertest');
const app = require('../app');
const api = (method, url) => request(app)[method](url).set(KEY); // public calls carry the test key

describe('Events Endpoint Tests', () => {

  // 1. Happy Path
  it('GET /api/events - returns event list', async () => {
    const res = await api('get', '/api/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // 2. Not Found Case
  it('GET /api/events/99999 - returns 404 for non-existent event ID', async () => {
    const res = await api('get', '/api/events/99999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  // 3. Invalid/Non-existent String ID
  it('GET /api/events/invalid-id - handles non-existent resource', async () => {
    const res = await api('get', '/api/events/invalid-id');
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