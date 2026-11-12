process.env.API_KEYS = 'test-events:week9-test-api-key';
process.env.SESSION_SECRET = 'week9-test-session-secret';

const request = require('supertest');
const app = require('../app');

jest.mock('../db/config', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

describe('Core API Integration', () => {
  it('GET /api/events returns 200 with a key', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('X-API-Key', 'week9-test-api-key');
    expect(res.status).toBe(200);
  });
});
