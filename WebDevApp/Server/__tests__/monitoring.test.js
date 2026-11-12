const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { rateLimit } = require('../middleware/rateLimit');
const { monitor, statsHandler } = require('../monitoring');

const API_KEY = 'monitoring-lab-test-key';
const quiet = { log() {}, warn() {} };

describe('request monitoring', () => {
  test('logs rejected requests safely and reports route metrics behind authentication', async () => {
    const output = jest.spyOn(console, 'log').mockImplementation(() => {});
    const app = express();
    const keyCheck = apiKeyAuth({ keys: `test:${API_KEY}`, log: quiet });

    app.use(monitor);
    app.use('/api', keyCheck, rateLimit({ windowMs: 60_000, max: 1 }));
    app.get('/api/items/:id', (req, res) => res.json({ id: req.params.id }));
    app.get('/stats', keyCheck, statsHandler);

    const noKey = await request(app).get('/api/items/1');
    const success = await request(app).get('/api/items/1?email=private@example.com')
      .set('X-API-Key', API_KEY);
    const limited = await request(app).get('/api/items/2').set('X-API-Key', API_KEY);
    const statsNoKey = await request(app).get('/stats');
    const stats = await request(app).get('/stats').set('X-API-Key', API_KEY);

    expect([noKey.status, success.status, limited.status, statsNoKey.status, stats.status])
      .toEqual([401, 200, 429, 401, 200]);
    expect(stats.body.total).toBe(4);
    expect(stats.body.clientErrors).toBe(3);
    expect(stats.body.serverErrors).toBe(0);
    expect(stats.body.routes['[GET] /api/items/:id']).toMatchObject({
      count: 1,
      clientErrors: 0,
      serverErrors: 0,
    });
    expect(stats.body.routes['(no route)']).toMatchObject({
      count: 2,
      clientErrors: 2,
    });
    expect(stats.body.routes['[GET] /stats']).toMatchObject({
      count: 1,
      clientErrors: 1,
    });

    const lines = output.mock.calls.map(([line]) => line).filter((line) => {
      try {
        JSON.parse(line);
        return true;
      } catch {
        return false;
      }
    }).map((line) => JSON.parse(line));
    const successLog = lines.find((line) => line.status === 200);
    expect(successLog).toMatchObject({
      method: 'GET',
      path: '/api/items/1',
      caller: `key-${crypto.createHash('sha256').update(API_KEY).digest('hex').slice(0, 6)}`,
    });
    expect(lines).toHaveLength(5);
    expect(JSON.stringify(lines)).not.toContain(API_KEY);
    expect(JSON.stringify(lines)).not.toContain('private@example.com');

    output.mockRestore();
  });
});
