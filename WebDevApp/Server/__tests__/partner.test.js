const request = require('supertest');

// Group 8's server URL from their openapi.yaml
const BASE_URL = process.env.PARTNER_URL || 'http://localhost:5000/api';

describe('Group 8 (StrathShop) Contract Tests', () => {

  // 1. GET /listings (Query Parameters & Content Schemas)
  describe('GET /listings', () => {
    it('returns 200 with an array of listings for valid category query parameter', async () => {
      const res = await request(BASE_URL).get('/listings?category=wellness');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      if (res.body.length > 0) {
        const item = res.body[0];
        expect(item).toHaveProperty('id');
        expect(typeof item.id).toBe('number');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('price');
        expect(typeof item.price).toBe('number');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('status');
        expect(['available', 'booked']).toContain(item.status);
      }
    });

    it('returns 400 when category parameter is invalid', async () => {
      const res = await request(BASE_URL).get('/listings?category=invalid_category');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // 2. GET /listings/{id} (Single Resource & 404 Case)
  describe('GET /listings/:id', () => {
    it('returns 200 with valid listing details for an existing ID', async () => {
      const res = await request(BASE_URL).get('/listings/14');
      if (res.status === 200) {
        expect(res.body).toHaveProperty('id', 14);
        expect(res.body).toHaveProperty('title');
        expect(res.body).toHaveProperty('price');
        expect(res.body).toHaveProperty('category');
        expect(res.body).toHaveProperty('status');
      } else {
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 404 for a non-existent listing ID', async () => {
      const res = await request(BASE_URL).get('/listings/999999');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // 3. PATCH /listings/{id}/availability (Scoped Update)
  describe('PATCH /listings/:id/availability', () => {
    it('returns 200 when updating availability status with valid payload', async () => {
      const res = await request(BASE_URL)
        .patch('/listings/14/availability')
        .send({ status: 'booked' });

      if (res.status === 200) {
        expect(res.body).toHaveProperty('status', 'booked');
      } else {
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
      }
    });

    it('returns 400 when status payload is invalid', async () => {
      const res = await request(BASE_URL)
        .patch('/listings/14/availability')
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 404 when attempting to update a non-existent listing ID', async () => {
      const res = await request(BASE_URL)
        .patch('/listings/999999/availability')
        .send({ status: 'available' });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  // 4. GET /categories & GET /categories/{id}
  describe('GET /categories', () => {
    it('returns 200 with an array of category items', async () => {
      const res = await request(BASE_URL).get('/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      if (res.body.length > 0) {
        const cat = res.body[0];
        expect(cat).toHaveProperty('id');
        expect(typeof cat.id).toBe('number');
        expect(cat).toHaveProperty('label');
        expect(typeof cat.label).toBe('string');
      }
    });

    it('returns 404 for a non-existent category ID', async () => {
      const res = await request(BASE_URL).get('/categories/999999');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

});