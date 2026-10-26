// Week 9 tests: API key authentication and rate limiting (no database needed).
const express = require('express');
const request = require('supertest');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { rateLimit } = require('../middleware/rateLimit');

const quiet = { log() {}, warn() {} };
const KEYS = 'partner:partner-secret-123,team:team-secret-456';

const build = ({ keys = KEYS, max = 100 } = {}) => {
  const app = express();
  app.get('/docs', (req, res) => res.json({ docs: true })); // outside /api, stays open
  app.use('/api', apiKeyAuth({ keys, log: quiet }), rateLimit({ windowMs: 60000, max }));
  app.get('/api/ping', (req, res) => res.json({ ok: true, consumer: req.consumer }));
  return app;
};

describe('API key authentication', () => {
  test('a request with no key gets 401', async () => {
    const res = await request(build()).get('/api/ping');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Missing or invalid API key' });
  });

  test('a request with a wrong key gets 401, and the key is not echoed back', async () => {
    const res = await request(build()).get('/api/ping').set('X-API-Key', 'wrong-key');
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toContain('wrong-key');
  });

  test('a valid key gets 200', async () => {
    const res = await request(build()).get('/api/ping').set('X-API-Key', 'partner-secret-123');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('each consumer has its own key and is told apart', async () => {
    const app = build();
    const a = await request(app).get('/api/ping').set('X-API-Key', 'partner-secret-123');
    const b = await request(app).get('/api/ping').set('X-API-Key', 'team-secret-456');
    expect(a.body.consumer).toBe('partner');
    expect(b.body.consumer).toBe('team');
  });

  test('a key that is only a prefix of a real key is rejected', async () => {
    const res = await request(build()).get('/api/ping').set('X-API-Key', 'partner-secret-12');
    expect(res.status).toBe(401);
  });

  test('routes outside /api (the docs page) stay open', async () => {
    const res = await request(build()).get('/docs');
    expect(res.status).toBe(200);
  });

  test('with no keys configured the check is off and a warning is logged', async () => {
    const warn = jest.fn();
    const app = express();
    app.use('/api', apiKeyAuth({ keys: '', log: { log() {}, warn } }));
    app.get('/api/ping', (req, res) => res.json({ ok: true }));
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(200);
    expect(warn).toHaveBeenCalled();
  });
});

describe('rate limiting', () => {
  test('requests over the limit get 429 with Retry-After and a JSON body', async () => {
    const app = build({ max: 3 });
    const codes = [];
    for (let i = 0; i < 5; i += 1) {
      const r = await request(app).get('/api/ping').set('X-API-Key', 'partner-secret-123');
      codes.push(r.status);
      if (i === 4) {
        expect(r.headers['retry-after']).toBeDefined();
        expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
        expect(r.body.message).toBe('Too many requests');
        expect(r.body.retryAfter).toBeGreaterThan(0);
      }
    }
    expect(codes).toEqual([200, 200, 200, 429, 429]);
  });

  test('the limit is per key: one consumer hitting it does not block another', async () => {
    const app = build({ max: 2 });
    for (let i = 0; i < 3; i += 1) {
      await request(app).get('/api/ping').set('X-API-Key', 'partner-secret-123');
    }
    const blocked = await request(app).get('/api/ping').set('X-API-Key', 'partner-secret-123');
    const other = await request(app).get('/api/ping').set('X-API-Key', 'team-secret-456');
    expect(blocked.status).toBe(429);
    expect(other.status).toBe(200);
  });
});
