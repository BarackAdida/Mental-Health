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
const good = { ok: true, json: async () => ({ data: [listing], count: 1 }) };
const bad = { ok: false, status: 500 };

describe('Partner circuit breaker', () => {
  let clock;
  beforeAll(() => {
    clock = 1700000000000;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => jest.restoreAllMocks());
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PARTNER_VERSION;
  });

  const get = () => request(app).get('/api/partner/counseling');

  test('with no saved data, an open circuit answers 502 without calling the partner', async () => {
    fetchWithRetry.mockResolvedValue(bad);
    for (let i = 0; i < 3; i++) {
      expect((await get()).status).toBe(502);
    }
    expect(fetchWithRetry).toHaveBeenCalledTimes(3);

    const res = await get(); // circuit is open now
    expect(res.status).toBe(502);
    expect(fetchWithRetry).toHaveBeenCalledTimes(3); // no new call
  });

  test('after the cooldown one trial call goes out; a good one closes the circuit', async () => {
    clock += 31000;
    fetchWithRetry.mockResolvedValueOnce(good);
    const trial = await get();
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
    expect(trial.status).toBe(200);
    expect(trial.body.stale).toBe(false);

    fetchWithRetry.mockResolvedValueOnce(good);
    await get(); // closed again, so the partner is called again
    expect(fetchWithRetry).toHaveBeenCalledTimes(2);
  });

  test('with saved data, an open circuit serves it flagged stale and skips the partner', async () => {
    fetchWithRetry.mockResolvedValue(bad);
    for (let i = 0; i < 3; i++) await get();
    expect(fetchWithRetry).toHaveBeenCalledTimes(3);

    const res = await get();
    expect(fetchWithRetry).toHaveBeenCalledTimes(3);
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(true);
    expect(res.body.data[0]).toEqual(listing);
  });

  test('a failed trial keeps the circuit open for another cooldown', async () => {
    clock += 31000;
    fetchWithRetry.mockResolvedValueOnce(bad);
    await get(); // the trial fails
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);

    clock += 1000;
    await get(); // still inside the new cooldown
    expect(fetchWithRetry).toHaveBeenCalledTimes(1);
  });
});
