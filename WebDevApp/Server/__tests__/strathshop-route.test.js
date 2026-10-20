// Tests our partner route in isolation (no database needed).
// The partner's HTTP server is replaced with a tiny local stand-in.
const http = require('http');
const express = require('express');
const request = require('supertest');

const sample = [
  { id: 17, title: '1-on-1 Counseling Session', description: 'x', price: 1500,
    category: 'counseling', condition: 'N/A', status: 'available',
    providerName: 'Dr. Wanjiku Mwangi', sellerName: 'Dr. Wanjiku Mwangi' },
];

let partner;
let partnerPort;
let mode = 'ok';
let lastRequest = null;

const makeApp = () => {
  jest.resetModules();
  const app = express();
  app.use('/api/partner', require('../routes/partner'));
  return app;
};

beforeAll((done) => {
  partner = http.createServer((req, res) => {
    lastRequest = { url: req.url, headers: req.headers };
    if (mode === 'error') { res.statusCode = 500; return res.end('boom'); }
    if (mode === 'badshape') { res.setHeader('content-type', 'application/json'); return res.end('{"oops":1}'); }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(sample));
  }).listen(0, () => { partnerPort = partner.address().port; done(); });
});
afterAll((done) => {
  partner.close(done);
});
beforeEach(() => {
  mode = 'ok';
  lastRequest = null;
  process.env.PARTNER_URL = `http://127.0.0.1:${partnerPort}`;
  delete process.env.PARTNER_API_KEY;
  delete process.env.PARTNER_API_KEY_HEADER;
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('returns only the fields our page needs, with the contract field names', async () => {
  const res = await request(makeApp()).get('/api/partner/counseling');
  expect(res.status).toBe(200);
  expect(res.body[0]).toEqual({
    id: 17, title: '1-on-1 Counseling Session', description: 'x', price: 1500,
    status: 'available', providerName: 'Dr. Wanjiku Mwangi',
  });
  expect(lastRequest.url).toBe('/listings?category=counseling');
});

test('sends no key header when no key is configured', async () => {
  await request(makeApp()).get('/api/partner/counseling');
  expect(lastRequest.headers['x-api-key']).toBeUndefined();
});

test('sends the key header when a key is configured, and never logs it', async () => {
  process.env.PARTNER_API_KEY = 'secret-test-key';
  await request(makeApp()).get('/api/partner/counseling');
  expect(lastRequest.headers['x-api-key']).toBe('secret-test-key');
  expect(JSON.stringify(console.error.mock.calls)).not.toContain('secret-test-key');
});

test('partner returns 500 -> 502 with a friendly message, status logged', async () => {
  mode = 'error';
  const res = await request(makeApp()).get('/api/partner/counseling');
  expect(res.status).toBe(502);
  expect(res.body).toEqual({ message: 'Partner data unavailable' });
  expect(console.error).toHaveBeenCalledWith('partner returned', 500);
});

test('partner returns the wrong shape -> 502', async () => {
  mode = 'badshape';
  const res = await request(makeApp()).get('/api/partner/counseling');
  expect(res.status).toBe(502);
});

test('partner is down (ECONNREFUSED) -> 502 and the log says why', async () => {
  // find a port that is genuinely closed: open one, note it, close it
  const closedPort = await new Promise((resolve) => {
    const s = http.createServer().listen(0, () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
  process.env.PARTNER_URL = `http://127.0.0.1:${closedPort}`;
  const res = await request(makeApp()).get('/api/partner/counseling');
  expect(res.status).toBe(502);
  expect(console.error).toHaveBeenCalledWith('partner call failed:', 'ECONNREFUSED');
});

test('partner hostname is wrong (ENOTFOUND) -> 502 and the log says why', async () => {
  process.env.PARTNER_URL = 'http://no-such-host-abc123.invalid';
  const res = await request(makeApp()).get('/api/partner/counseling');
  expect(res.status).toBe(502);
  expect(console.error).toHaveBeenCalledWith('partner call failed:', 'ENOTFOUND');
});

test('PARTNER_URL missing -> 502, no crash', async () => {
  delete process.env.PARTNER_URL;
  const res = await request(makeApp()).get('/api/partner/counseling');
  expect(res.status).toBe(502);
});
