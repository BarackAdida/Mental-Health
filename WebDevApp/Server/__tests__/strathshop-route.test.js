const request = require('supertest');
const app = require('../app');
const { fetchWithRetry } = require('../resilientFetch');

jest.mock('../resilientFetch', () => ({
  fetchWithRetry: jest.fn(),
}));

describe('Partner Counseling Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PARTNER_VERSION = 'v2'; // Force v2 for the test
  });

  // Test 1: Cache is empty, partner fails -> expect 502
  it('partner returns 500 -> 502 with a friendly message', async () => {
    fetchWithRetry.mockResolvedValueOnce({ ok: false, status: 500 });
    const res = await request(app).get('/api/partner/counseling');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ message: 'Partner data unavailable' });
  });

  // Test 2: Partner succeeds -> expect 200, which populates the cache
  it('returns fields our page needs with the new Week 11 shape', async () => {
    fetchWithRetry.mockResolvedValueOnce({
      ok: true,
      // THE FIX IS HERE: We wrap the array in { data: [...] } for v2
      json: async () => ({
        data: [
          { id: 17, title: '1-on-1', description: 'x', price: 1500, status: 'available', providerName: 'Dr. Wanjiku' }
        ]
      })
    });

    const res = await request(app).get('/api/partner/counseling');
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(false);
    expect(res.body.data[0]).toEqual({
      id: 17, title: '1-on-1', description: 'x', price: 1500, status: 'available', providerName: 'Dr. Wanjiku'
    });
  });
});