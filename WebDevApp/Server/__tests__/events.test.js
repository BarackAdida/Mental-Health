const request = require('supertest');
const app = require('../app');

jest.mock('../db/config', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

describe('Events Endpoint Tests', () => {
  it('GET /api/events - returns event list', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('X-API-Key', 'd65c6437ae484cb71f10a78a38e3cbd4378131f2eeac4230');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/events/99999 - returns 404 for non-existent event ID', async () => {
    const res = await request(app)
      .get('/api/events/99999')
      .set('X-API-Key', 'd65c6437ae484cb71f10a78a38e3cbd4378131f2eeac4230');
    expect(res.status).toBe(404);
  });
});
