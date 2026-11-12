const request = require('supertest');

// Dummy key for tests only. Set before the app loads so the key check is on.
const TEST_KEY = 'jest-test-key';
process.env.API_KEYS = `jest:${TEST_KEY}`;
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'jest-session-secret';

const app = require('../app');

jest.mock('../db/config', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

describe('Events Endpoint Tests', () => {
  it('GET /api/events - returns event list', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('X-API-Key', TEST_KEY);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/events/99999 - returns 404 for non-existent event ID', async () => {
    const res = await request(app)
      .get('/api/events/99999')
      .set('X-API-Key', TEST_KEY);
    expect(res.status).toBe(404);
  });
});