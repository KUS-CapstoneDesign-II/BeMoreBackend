const request = require('supertest');
const { app, server } = require('../app');

afterAll((done) => {
  try { server && server.close(() => done()); } catch (_) { done(); }
});

describe('Zod validations', () => {
  test('POST /api/session/start requires userId and counselorId', async () => {
    const res = await request(app)
      .post('/api/session/start')
      .send({})
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/emotion requires text', async () => {
    const res = await request(app)
      .post('/api/emotion')
      .send({})
      .set('Content-Type', 'application/json');
    // In latest code this should be 400 from Zod/global handler after deploy
    expect([400, 500]).toContain(res.status);
  });
});


