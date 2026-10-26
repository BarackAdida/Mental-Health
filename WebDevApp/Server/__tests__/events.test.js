process.env.API_KEYS = 'jest:jest-test-key'; // must be set before ../app is loaded
const KEY = { 'X-API-Key': 'jest-test-key' };
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../app');
const api = (method, url) => request(app)[method](url).set(KEY); // public calls carry the test key
const pool = require('../db/config');

const BASE = '/api/events';
const ADMIN_EMAIL = `jest-admin-${Date.now()}@test.local`;
const ADMIN_PW = 'jest-password-123';
const createdIds = [];
let admin; // logged-in supertest agent
let adminId;

const validEvent = (over = {}) => ({
  title: 'Jest Workshop',
  description: 'created by tests',
  location: 'Room 1',
  startTime: '2030-01-15T14:00:00Z',
  ...over,
});
const create = async (over) => {
  const res = await admin.post(BASE).send(validEvent(over));
  if (res.status === 201) createdIds.push(res.body.id);
  return res;
};
const expectEventShape = (e) => {
  expect(typeof e.id).toBe('string');
  expect(e.id).toMatch(/^evt_\d+$/);
  expect(typeof e.title).toBe('string');
  expect(typeof e.location).toBe('string');
  expect(typeof e.startTime).toBe('string');
  expect(Number.isNaN(Date.parse(e.startTime))).toBe(false);
  expect(typeof e.cancelled).toBe('boolean');
};

beforeAll(async () => {
  const hash = await bcrypt.hash(ADMIN_PW, 4);
  const r = await pool.query(
    `INSERT INTO users (name, email, password_hash, is_admin) VALUES ('Jest Admin', $1, $2, true) RETURNING id`,
    [ADMIN_EMAIL, hash]
  );
  adminId = r.rows[0].id;
  admin = request.agent(app);
  const login = await admin.post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PW });
  expect(login.status).toBe(200);
});

afterAll(async () => {
  for (const pid of createdIds) await pool.query('DELETE FROM events WHERE id = $1', [parseInt(pid.slice(4), 10)]);
  await pool.query('DELETE FROM users WHERE id = $1', [adminId]);
  await pool.end();
});

describe('GET /events', () => {
  it('returns an array of events with every contract field (public, no login)', async () => {
    await create();
    const res = await api('get', BASE);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach(expectEventShape);
  });

  it('after=<date> only returns events on or after that date', async () => {
    await create({ startTime: '2031-06-01T09:00:00Z', title: 'Later' });
    await create({ startTime: '2031-03-01T09:00:00Z', title: 'Earlier' });
    const res = await api('get', `${BASE}?after=2031-05-01`);
    expect(res.status).toBe(200);
    const titles = res.body.map((e) => e.title);
    expect(titles).toContain('Later');
    expect(titles).not.toContain('Earlier');
    res.body.forEach((e) => expect(Date.parse(e.startTime)).toBeGreaterThanOrEqual(Date.parse('2031-05-01T00:00:00Z')));
  });

  it('rejects an invalid after date with 400 and a message', async () => {
    for (const bad of ['banana', '2026-13-45', '2026-02-30']) {
      const res = await api('get', `${BASE}?after=${bad}`);
      expect(res.status).toBe(400);
      expect(typeof res.body.message).toBe('string');
    }
  });

  it('edge: far-future after date returns an empty array', async () => {
    const res = await api('get', `${BASE}?after=2999-01-01`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('edge: an event exactly at midnight on the after date is included', async () => {
    const e = await create({ startTime: '2032-12-01T00:00:00Z', title: 'Boundary' });
    const inc = await api('get', `${BASE}?after=2032-12-01`);
    expect(inc.body.map((x) => x.id)).toContain(e.body.id);
    const exc = await api('get', `${BASE}?after=2032-12-02`);
    expect(exc.body.map((x) => x.id)).not.toContain(e.body.id);
  });
});

describe('GET /events/:id', () => {
  it('returns one event with the contract shape', async () => {
    const c = await create({ title: 'Fetch me' });
    const res = await api('get', `${BASE}/${c.body.id}`);
    expect(res.status).toBe(200);
    expectEventShape(res.body);
    expect(res.body.id).toBe(c.body.id);
    expect(res.body.title).toBe('Fetch me');
    expect(res.body.cancelled).toBe(false);
  });

  it('returns 404 + message for an id that does not exist', async () => {
    const res = await api('get', `${BASE}/evt_999999999`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  it('edge: a malformed id is a 404, not a 500', async () => {
    const res = await api('get', `${BASE}/not-an-id`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

describe('POST /events', () => {
  it('creates an event: 201, contract shape, cancelled defaults to false', async () => {
    const res = await create({ title: 'Peer Support Circle', location: 'Library Annex, Room 4' });
    expect(res.status).toBe(201);
    expectEventShape(res.body);
    expect(res.body.title).toBe('Peer Support Circle');
    expect(res.body.location).toBe('Library Annex, Room 4');
    expect(res.body.startTime).toBe('2030-01-15T14:00:00.000Z');
    expect(res.body.cancelled).toBe(false);
  });

  it.each([
    ['title', { title: undefined }],
    ['location', { location: undefined }],
    ['startTime', { startTime: undefined }],
  ])('400 + message when %s is missing', async (_f, over) => {
    const res = await admin.post(BASE).send(validEvent(over));
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
  });

  it('400 when startTime is not a date, or title is the wrong type', async () => {
    expect((await admin.post(BASE).send(validEvent({ startTime: 'soon' }))).status).toBe(400);
    expect((await admin.post(BASE).send(validEvent({ title: 123 }))).status).toBe(400);
  });

  it('edge: unauthenticated request is rejected with 401', async () => {
    const res = await api('post', BASE).send(validEvent());
    expect(res.status).toBe(401);
  });
});

describe('PATCH /events/:id', () => {
  it('sets cancelled=true and leaves other fields untouched', async () => {
    const c = await create({ title: 'To cancel' });
    const res = await admin.patch(`${BASE}/${c.body.id}`).send({ cancelled: true });
    expect(res.status).toBe(200);
    expectEventShape(res.body);
    expect(res.body.cancelled).toBe(true);
    expect(res.body.title).toBe('To cancel');
    const check = await api('get', `${BASE}/${c.body.id}`);
    expect(check.body.cancelled).toBe(true);
  });

  it('updates location and startTime', async () => {
    const c = await create();
    const res = await admin.patch(`${BASE}/${c.body.id}`).send({ location: 'Room 3', startTime: '2030-02-01T10:00:00Z' });
    expect(res.status).toBe(200);
    expect(res.body.location).toBe('Room 3');
    expect(res.body.startTime).toBe('2030-02-01T10:00:00.000Z');
  });

  it('400 for wrong types or an empty body', async () => {
    const c = await create();
    expect((await admin.patch(`${BASE}/${c.body.id}`).send({ cancelled: 'yes' })).status).toBe(400);
    expect((await admin.patch(`${BASE}/${c.body.id}`).send({ startTime: 'nope' })).status).toBe(400);
    const empty = await admin.patch(`${BASE}/${c.body.id}`).send({});
    expect(empty.status).toBe(400);
    expect(empty.body).toHaveProperty('message');
  });

  it('404 + message for an id that does not exist', async () => {
    const res = await admin.patch(`${BASE}/evt_999999999`).send({ cancelled: true });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  it('edge: unauthenticated PATCH is rejected with 401', async () => {
    const c = await create();
    expect((await api('patch', `${BASE}/${c.body.id}`).send({ cancelled: true })).status).toBe(401);
  });
});

describe('DELETE /events/:id', () => {
  it('returns 204 with no body, and the event is gone afterwards', async () => {
    const c = await create({ title: 'To delete' });
    const res = await admin.delete(`${BASE}/${c.body.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await api('get', `${BASE}/${c.body.id}`)).status).toBe(404);
  });

  it('404 + message for an id that does not exist', async () => {
    const res = await admin.delete(`${BASE}/evt_999999999`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  it('edge: unauthenticated DELETE is rejected with 401', async () => {
    const c = await create();
    expect((await api('delete', `${BASE}/${c.body.id}`)).status).toBe(401);
  });
});
