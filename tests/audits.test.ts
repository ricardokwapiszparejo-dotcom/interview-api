import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Fixed clock so auto-assigned slots are deterministic.
const NINE_AM = '2027-03-10T09:00:00';
const app = () => createApp({ now: () => new Date(NINE_AM) });

const base = { cliente: 'acme@example.com', tecnico: 'Ana Ruiz' };

describe('POST /audits', () => {
  it('creates an audit in PENDIENTE state at the first free slot', async () => {
    const res = await request(app()).post('/audits').send(base);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ...base, estado: 'PENDIENTE', fechaHora: NINE_AM });
    expect(res.body.id).toBeTruthy();
  });

  it.each([
    ['missing cliente', { tecnico: 'Ana' }],
    ['missing tecnico', { cliente: 'acme' }],
    ['fechaHora is not accepted', { ...base, fechaHora: '2027-03-10T10:00:00' }],
    ['estado is not accepted', { ...base, estado: 'CONFIRMADA' }],
  ])('rejects invalid body: %s', async (_name, body) => {
    expect((await request(app()).post('/audits').send(body)).status).toBe(400);
  });
});

describe('POST /audits · slot auto-assignment', () => {
  it('chains audits of the same technician back to back', async () => {
    const a = app();
    await request(a).post('/audits').send(base);
    const second = await request(a).post('/audits').send({ cliente: 'other', tecnico: base.tecnico });
    const third = await request(a).post('/audits').send({ cliente: 'another', tecnico: base.tecnico });

    expect(second.body.fechaHora).toBe('2027-03-10T10:00:00');
    expect(third.body.fechaHora).toBe('2027-03-10T11:00:00');
  });

  it('pushes audits of the same client to the next slot', async () => {
    const a = app();
    await request(a).post('/audits').send(base);
    const res = await request(a).post('/audits').send({ cliente: base.cliente, tecnico: 'Other Tech' });

    expect(res.body.fechaHora).toBe('2027-03-10T10:00:00');
  });

  it('schedules a different technician and client in parallel', async () => {
    const a = app();
    await request(a).post('/audits').send(base);
    const res = await request(a).post('/audits').send({ cliente: 'other', tecnico: 'Other Tech' });

    expect(res.body.fechaHora).toBe(NINE_AM);
  });

  it('reuses a gap left by a cancelled audit', async () => {
    const a = app();
    const { body: first } = await request(a).post('/audits').send(base);
    await request(a).post('/audits').send({ cliente: 'other', tecnico: base.tecnico });
    await request(a).delete(`/audits/${first.id}`);

    const res = await request(a).post('/audits').send({ cliente: 'third', tecnico: base.tecnico });
    expect(res.body.fechaHora).toBe(NINE_AM);
  });
});

describe('GET /audits', () => {
  it('lists all audits', async () => {
    const a = app();
    expect((await request(a).get('/audits')).body).toEqual([]);

    await request(a).post('/audits').send(base);

    const res = await request(a).get('/audits');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].estado).toBe('PENDIENTE');
  });
});

describe('GET /audits/:id', () => {
  it('returns the audit detail', async () => {
    const a = app();
    const { body: created } = await request(a).post('/audits').send(base);

    const res = await request(a).get(`/audits/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
  });

  it('returns 404 for a missing audit', async () => {
    expect((await request(app()).get('/audits/nope')).status).toBe(404);
  });
});

describe('DELETE /audits/:id', () => {
  it('cancels the audit and keeps it in the listing', async () => {
    const a = app();
    const { body: created } = await request(a).post('/audits').send(base);

    expect((await request(a).delete(`/audits/${created.id}`)).status).toBe(204);

    const detail = await request(a).get(`/audits/${created.id}`);
    expect(detail.body.estado).toBe('CANCELADA');
    expect((await request(a).get('/audits')).body).toHaveLength(1);
  });

  it('returns 404 for a missing audit', async () => {
    expect((await request(app()).delete('/audits/nope')).status).toBe(404);
  });

  it('rejects cancelling an already cancelled audit', async () => {
    const a = app();
    const { body: created } = await request(a).post('/audits').send(base);
    await request(a).delete(`/audits/${created.id}`);

    expect((await request(a).delete(`/audits/${created.id}`)).status).toBe(409);
  });
});

describe('PUT /audits/:id', () => {
  it('updates client and technician keeping the assigned slot', async () => {
    const a = app();
    const { body: created } = await request(a).post('/audits').send(base);

    const res = await request(a)
      .put(`/audits/${created.id}`)
      .send({ cliente: 'new-client', tecnico: 'New Tech' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.id,
      cliente: 'new-client',
      tecnico: 'New Tech',
      fechaHora: created.fechaHora,
      estado: 'PENDIENTE',
    });
  });

  it('rejects an update that would clash with a busy technician', async () => {
    const a = app();
    await request(a).post('/audits').send(base);
    const { body: other } = await request(a)
      .post('/audits')
      .send({ cliente: 'other', tecnico: 'Other Tech' }); // parallel slot at 09:00

    const res = await request(a)
      .put(`/audits/${other.id}`)
      .send({ cliente: 'other', tecnico: base.tecnico });
    expect(res.status).toBe(409);
  });

  it('confirms a pending audit via estado: CONFIRMADA', async () => {
    const a = app();
    const { body: created } = await request(a).post('/audits').send(base);

    const res = await request(a)
      .put(`/audits/${created.id}`)
      .send({ ...base, estado: 'CONFIRMADA' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('CONFIRMADA');
  });

  it('rejects editing a confirmed audit', async () => {
    const a = app();
    const { body: created } = await request(a).post('/audits').send(base);
    await request(a).put(`/audits/${created.id}`).send({ ...base, estado: 'CONFIRMADA' });

    const res = await request(a).put(`/audits/${created.id}`).send({ ...base, cliente: 'new' });
    expect(res.status).toBe(409);
  });

  it('rejects any update on a cancelled audit', async () => {
    const a = app();
    const { body: created } = await request(a).post('/audits').send(base);
    await request(a).delete(`/audits/${created.id}`);

    expect((await request(a).put(`/audits/${created.id}`).send(base)).status).toBe(409);
  });

  it('returns 404 for a missing audit', async () => {
    expect((await request(app()).put('/audits/nope').send(base)).status).toBe(404);
  });

  it.each([
    ['missing fields', { cliente: 'acme' }],
    ['fechaHora is not accepted', { ...base, fechaHora: '2027-03-10T12:00:00' }],
    ['estado CANCELADA (cancel via DELETE)', { ...base, estado: 'CANCELADA' }],
  ])('rejects invalid body: %s', async (_name, body) => {
    const a = app();
    const { body: created } = await request(a).post('/audits').send(base);
    expect((await request(a).put(`/audits/${created.id}`).send(body)).status).toBe(400);
  });
});

describe('GET /', () => {
  it('serves the test UI', async () => {
    const res = await request(app()).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });
});
