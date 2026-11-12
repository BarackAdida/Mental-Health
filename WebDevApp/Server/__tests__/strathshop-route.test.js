// Dummy settings for tests only. Set before the app loads.
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'jest-session-secret';
process.env.PARTNER_URL = 'https://partner.test/api';

const request = require('supertest');
const app = require('../app');
const { fetchWithRetry } = require('../resilientFetch');

jest.mock('../db/config', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

jest.mock('../resilientFetch', () => ({
  fetchWithRetry: jest.fn(),
}));

const listing = {
  id: 17, title: '1-on-1', description: 'x', price: 1500, status: 'available', providerName: 'Dr. Wanjiku'
};

describe('Partner Counseling Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PARTNER_VERSION; // use the default (v2)
  });

  // Test 1: Cache is empty, partner fails -> expect 502
  it('partner returns 500 -> 502 with a friendly message', async () => {
    fetchWithRetry.mockResolvedValueOnce({ ok: false, status: 500 });
    const res = await request(app).get('/api/partner/counseling');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ message: 'Partner data unavailable' });
  });

  // Test 2: Partner succeeds on the default v2 path -> 200, which fills the cache
  it('calls the v2 path by default and returns the fields our page needs', async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [listing], count: 1 })
    });

    const res = await request(app).get('/api/partner/counseling');
    expect(fetchWithRetry.mock.calls[0][0]).toContain('/v2/listings?category=counseling');
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(false);
    expect(res.body.data[0]).toEqual(listing);
  });

  // Test 3: Partner fails after a good call -> last good data, flagged stale
  it('serves the last good data, flagged stale, when the partner fails', async () => {
    fetchWithRetry.mockResolvedValueOnce({ ok: false, status: 500 });
    const res = await request(app).get('/api/partner/counseling');
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(true);
    expect(res.body.data[0]).toEqual(listing);
  });

  // Test 4: PARTNER_VERSION=v1 still works with the old array shape
  it('still works on v1 when PARTNER_VERSION=v1', async () => {
    process.env.PARTNER_VERSION = 'v1';
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      json: async () => [listing]
    });

    const res = await request(app).get('/api/partner/counseling');
    expect(fetchWithRetry.mock.calls[0][0]).toContain('/listings?category=counseling');
    expect(fetchWithRetry.mock.calls[0][0]).not.toContain('/v2/');
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(false);
  });
});