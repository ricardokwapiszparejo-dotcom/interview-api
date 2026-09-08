import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('POST /audits', () => {
  it('creates an audit in PENDIENTE state', async () => {
    const res = await request(createApp()).post('/audits').send({
      fechaHora: '2027-03-10T10:00:00',
      cliente: 'acme@example.com',
      tecnico: 'Ana Ruiz',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      fechaHora: '2027-03-10T10:00:00',
      cliente: 'acme@example.com',
      tecnico: 'Ana Ruiz',
      estado: 'PENDIENTE',
    });
    expect(res.body.id).toBeTruthy();
  });

  it.each([
    ['missing fechaHora', { cliente: 'acme', tecnico: 'Ana' }],
    ['missing cliente', { fechaHora: '2027-03-10T10:00:00', tecnico: 'Ana' }],
    ['missing tecnico', { fechaHora: '2027-03-10T10:00:00', cliente: 'acme' }],
    ['invalid fechaHora', { fechaHora: 'not-a-date', cliente: 'acme', tecnico: 'Ana' }],
  ])('rejects invalid body: %s', async (_name, body) => {
    const res = await request(createApp()).post('/audits').send(body);
    expect(res.status).toBe(400);
  });

  it('rejects estado in the body', async () => {
    const res = await request(createApp()).post('/audits').send({
      fechaHora: '2027-03-10T10:00:00',
      cliente: 'acme',
      tecnico: 'Ana',
      estado: 'CONFIRMADA',
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /audits', () => {
  it('lists all audits', async () => {
    const app = createApp();
    expect((await request(app).get('/audits')).body).toEqual([]);

    await request(app).post('/audits').send({
      fechaHora: '2027-03-10T10:00:00',
      cliente: 'acme',
      tecnico: 'Ana',
    });

    const res = await request(app).get('/audits');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].estado).toBe('PENDIENTE');
  });
});

describe('GET /audits/:id', () => {
  it('returns the audit detail', async () => {
    const app = createApp();
    const { body: created } = await request(app).post('/audits').send({
      fechaHora: '2027-03-10T10:00:00',
      cliente: 'acme',
      tecnico: 'Ana',
    });

    const res = await request(app).get(`/audits/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
  });

  it('returns 404 for a missing audit', async () => {
    const res = await request(createApp()).get('/audits/nope');
    expect(res.status).toBe(404);
  });
});
