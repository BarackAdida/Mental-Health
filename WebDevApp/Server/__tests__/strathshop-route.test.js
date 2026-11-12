process.env.SESSION_SECRET = 'week10-test-session-secret';
process.env.PARTNER_URL = 'https://test.partner.invalid/api';

const request = require('supertest');
const app = require('../app');
const { fetchWithRetry } = require('../resilientFetch');

jest.mock('../db/config', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

jest.mock('../resilientFetch', () => ({
  fetchWithRetry: jest.fn(),
}));

describe('Partner Counseling Route', () => {
  let originalPartnerVersion;

  beforeEach(() => {
    jest.clearAllMocks();
    originalPartnerVersion = process.env.PARTNER_VERSION;
    process.env.PARTNER_VERSION = 'v1';
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalPartnerVersion === undefined) delete process.env.PARTNER_VERSION;
    else process.env.PARTNER_VERSION = originalPartnerVersion;
    jest.restoreAllMocks();
  });

  it('partner returns 500 -> 502 with a friendly message', async () => {
    fetchWithRetry.mockResolvedValueOnce({ ok: false, status: 500 });
    const res = await request(app).get('/api/partner/counseling');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ message: 'Partner data unavailable' });
    expect(console.error).toHaveBeenCalledWith('partner call failed:', 'partner returned 500');
  });

  it('serves cache hits, switches partner versions, and falls back to stale data', async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 17, title: '1-on-1', description: 'x', price: 1500, status: 'available', providerName: 'Dr. Wanjiku' }
      ]
    });

    const res = await request(app).get('/api/partner/counseling');
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(false);
    expect(res.body.data[0]).toEqual({
      id: 17, title: '1-on-1', description: 'x', price: 1500, status: 'available', providerName: 'Dr. Wanjiku'
    });

    const cached = await request(app).get('/api/partner/counseling');
    expect(cached.status).toBe(200);
    expect(cached.body.data).toEqual(res.body.data);
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);

    process.env.PARTNER_VERSION = 'v2';
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 18, title: 'Exam Stress Workshop', description: 'x', price: 500, status: 'available', providerName: 'Dr. Wanjiku' },
        ],
      }),
    });
    const migrated = await request(app).get('/api/partner/counseling');
    expect(migrated.status).toBe(200);
    expect(migrated.body.stale).toBe(false);
    expect(migrated.body.data[0].id).toBe(18);
    expect(fetchWithRetry).toHaveBeenCalledTimes(2);
    expect(fetchWithRetry.mock.calls[1][0]).toContain('/v2/listings?category=counseling');

    const currentTime = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(currentTime + 61_000);
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    fetchWithRetry.mockRejectedValueOnce(timeout);
    const stale = await request(app).get('/api/partner/counseling');
    expect(stale.status).toBe(200);
    expect(stale.body).toMatchObject({
      data: migrated.body.data,
      stale: true,
      asOf: migrated.body.asOf,
    });
    expect(console.error).toHaveBeenCalledWith('partner call failed:', 'timeout');
  });
});
