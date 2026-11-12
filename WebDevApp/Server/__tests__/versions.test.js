process.env.API_KEYS = 'lab-test:lab-test-api-key';
process.env.SESSION_SECRET = 'week13-test-session-secret';

jest.mock('../db/config', () => ({
  query: jest.fn(),
}));

const pool = require('../db/config');
const request = require('supertest');
const app = require('../app');

const eventRow = {
  id: 17,
  title: 'Exam Stress Workshop',
  description: 'A practical workshop',
  location: 'Student Center',
  start_time: '2026-11-15T14:00:00.000Z',
  cancelled: false,
};

describe('event API versions', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    pool.query.mockResolvedValue({ rows: [eventRow] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('v1 paths preserve the array shape and announce deprecation', async () => {
    for (const path of ['/api/v1/events', '/api/events']) {
      const response = await request(app).get(path).set('X-API-Key', 'lab-test-api-key');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toMatchObject({ id: 'evt_17', title: eventRow.title });
      expect(response.headers.deprecation).toBe('true');
      expect(response.headers.sunset).toBe('Fri, 20 Nov 2026 00:00:00 GMT');
      expect(response.headers.link).toBe('</api/v2/events>; rel="successor-version"');
    }
  });

  test('v2 wraps its list and still requires an API key', async () => {
    const response = await request(app).get('/api/v2/events').set('X-API-Key', 'lab-test-api-key');
    const unauthorized = await request(app).get('/api/v2/events');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      count: 1,
      data: [{ id: 'evt_17', title: eventRow.title }],
    });
    expect(response.headers.deprecation).toBeUndefined();
    expect(unauthorized.status).toBe(401);
  });

  test('v1 and v2 detail routes preserve their respective response envelopes', async () => {
    const v1 = await request(app).get('/api/v1/events/evt_17').set('X-API-Key', 'lab-test-api-key');
    const v2 = await request(app).get('/api/v2/events/evt_17').set('X-API-Key', 'lab-test-api-key');

    expect(v1.status).toBe(200);
    expect(v1.body).toMatchObject({ id: 'evt_17', title: eventRow.title });
    expect(v1.headers.deprecation).toBe('true');
    expect(v2.status).toBe(200);
    expect(v2.body).toMatchObject({ data: { id: 'evt_17', title: eventRow.title } });
    expect(v2.headers.deprecation).toBeUndefined();
  });

  test('v1 subroutes also send deprecation headers', async () => {
    const response = await request(app).get('/api/events/saved').set('X-API-Key', 'lab-test-api-key');

    expect(response.status).toBe(401);
    expect(response.headers.deprecation).toBe('true');
  });
});
