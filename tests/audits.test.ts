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
