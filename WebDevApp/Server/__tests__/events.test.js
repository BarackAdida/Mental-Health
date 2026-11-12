const express = require('express');
const request = require('supertest');
const pool = require('../db/config');
const eventsRouter = require('../routes/events');

jest.mock('../db/config', () => ({
  query: jest.fn(),
}));

const eventRow = (overrides = {}) => ({
  id: 7,
  title: 'Campus Wellbeing Workshop',
  description: 'A practical workshop',
  location: 'Student Center, Room 2',
  start_time: '2026-11-15T14:00:00.000Z',
  cancelled: false,
  ...overrides,
});

let adminAccess;

const makeApp = (userId = null, isAdmin = true) => {
  adminAccess = isAdmin;
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = userId ? { userId } : {};
    next();
  });
  app.use('/api/events', eventsRouter);
  return app;
};

beforeEach(() => {
  pool.query.mockReset();
  pool.query.mockImplementation(async (sql) => {
    if (sql.includes('SELECT is_admin FROM users')) {
      return { rows: [{ is_admin: adminAccess }] };
    }
    return { rows: [] };
  });
});

describe('GET /api/events', () => {
  test('returns events with the contract field names and types', async () => {
    pool.query.mockResolvedValueOnce({ rows: [eventRow()] });

    const res = await request(makeApp()).get('/api/events');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{
      id: 'evt_7',
      title: 'Campus Wellbeing Workshop',
      description: 'A practical workshop',
      location: 'Student Center, Room 2',
      startTime: '2026-11-15T14:00:00.000Z',
      cancelled: false,
    }]);
    expect(typeof res.body[0].id).toBe('string');
    expect(typeof res.body[0].cancelled).toBe('boolean');
  });

  test('filters events by a valid after date', async () => {
    pool.query.mockResolvedValueOnce({ rows: [eventRow()] });

    const res = await request(makeApp()).get('/api/events?after=2026-11-15');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('start_time >='),
      ['2026-11-15']
    );
  });

  test('rejects an impossible after date without querying the database', async () => {
    const res = await request(makeApp()).get('/api/events?after=2026-02-30');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('GET /api/events/:id', () => {
  test('returns one event using its public string ID', async () => {
    pool.query.mockResolvedValueOnce({ rows: [eventRow()] });

    const res = await request(makeApp()).get('/api/events/evt_7');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'evt_7', title: 'Campus Wellbeing Workshop' });
    expect(res.body).toHaveProperty('startTime');
    expect(res.body).toHaveProperty('cancelled', false);
  });

  test('returns 404 for an invalid or missing event ID', async () => {
    const app = makeApp();
    const invalid = await request(app).get('/api/events/not-an-id');
    expect(invalid.status).toBe(404);
    expect(invalid.body).toHaveProperty('message');

    const missing = await request(app).get('/api/events/99999');
    expect(missing.status).toBe(404);
    expect(missing.body).toHaveProperty('message');
  });
});

describe('POST /api/events', () => {
  test('creates an event and returns 201 with the complete event', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ is_admin: true }] })
      .mockResolvedValueOnce({ rows: [eventRow()] });

    const res = await request(makeApp(1))
      .post('/api/events')
      .send({
        title: 'Campus Wellbeing Workshop',
        description: 'A practical workshop',
        location: 'Student Center, Room 2',
        startTime: '2026-11-15T14:00:00.000Z',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'evt_7', cancelled: false });
  });

  test('rejects missing required fields before inserting', async () => {
    const res = await request(makeApp(1))
      .post('/api/events')
      .send({ title: 'Workshop' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('requires an admin session', async () => {
    const anonymous = await request(makeApp()).post('/api/events').send({});
    expect(anonymous.status).toBe(401);

    const nonAdmin = await request(makeApp(2, false)).post('/api/events').send({});
    expect(nonAdmin.status).toBe(403);
  });
});

describe('PATCH /api/events/:id', () => {
  test('updates an event and returns its full updated representation', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ is_admin: true }] })
      .mockResolvedValueOnce({ rows: [eventRow({ cancelled: true })] });

    const res = await request(makeApp(1))
      .patch('/api/events/evt_7')
      .send({ cancelled: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'evt_7', cancelled: true });
  });

  test('rejects a cancelled value that is not a boolean', async () => {
    const res = await request(makeApp(1))
      .patch('/api/events/evt_7')
      .send({ cancelled: 'yes' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('returns 404 when the event does not exist', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ is_admin: true }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp(1))
      .patch('/api/events/evt_99999')
      .send({ cancelled: true });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

describe('DELETE /api/events/:id', () => {
  test('deletes an event and returns 204 with no body', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ is_admin: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 7 }] });

    const res = await request(makeApp(1)).delete('/api/events/evt_7');

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
  });

  test('returns 404 when the event does not exist', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ is_admin: true }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(makeApp(1)).delete('/api/events/evt_99999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});
