const request = require('supertest');
const { app, server } = require('../app');

afterAll((done) => {
  try {
    server && server.close(() => done());
  } catch (_) {
    done();
  }
});

describe('Smoke', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  test('POST /api/emotion returns success with emotion', async () => {
    const res = await request(app)
      .post('/api/emotion')
      .send({ text: '오늘은 조금 불안하지만 괜찮아요' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('emotion');
  });
});


