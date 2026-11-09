const request = require('supertest');
const app = require('../app');

jest.mock('../db/config', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

describe('Core API Integration', () => {
  it('GET /api/events returns 200 with a key', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('X-API-Key', 'd65c6437ae484cb71f10a78a38e3cbd4378131f2eeac4230');
    expect(res.status).toBe(200);
  });
});
