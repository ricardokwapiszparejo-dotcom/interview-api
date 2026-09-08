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

describe('POST /audits · overlap rules', () => {
  const base = { fechaHora: '2027-03-10T10:00:00', cliente: 'acme', tecnico: 'Ana Ruiz' };

  async function appWithBaseAudit() {
    const app = createApp();
    expect((await request(app).post('/audits').send(base)).status).toBe(201);
    return app;
  }

  it.each(['2027-03-10T09:30:00', '2027-03-10T10:30:00'])(
    'rejects an overlapping audit for the same technician at %s',
    async (fechaHora) => {
      const app = await appWithBaseAudit();
      const res = await request(app)
        .post('/audits')
        .send({ fechaHora, cliente: 'other-client', tecnico: base.tecnico });
      expect(res.status).toBe(409);
    },
  );

  it('rejects an overlapping audit for the same client', async () => {
    const app = await appWithBaseAudit();
    const res = await request(app)
      .post('/audits')
      .send({ fechaHora: '2027-03-10T10:30:00', cliente: base.cliente, tecnico: 'Other Tech' });
    expect(res.status).toBe(409);
  });

  it('accepts a back-to-back audit (exclusive boundary)', async () => {
    const app = await appWithBaseAudit();
    const res = await request(app)
      .post('/audits')
      .send({ fechaHora: '2027-03-10T11:00:00', cliente: base.cliente, tecnico: base.tecnico });
    expect(res.status).toBe(201);
  });

  it('accepts an overlapping audit for a different technician and client', async () => {
    const app = await appWithBaseAudit();
    const res = await request(app)
      .post('/audits')
      .send({ fechaHora: '2027-03-10T10:30:00', cliente: 'other-client', tecnico: 'Other Tech' });
    expect(res.status).toBe(201);
  });
});

describe('DELETE /audits/:id', () => {
  const base = { fechaHora: '2027-03-10T10:00:00', cliente: 'acme', tecnico: 'Ana Ruiz' };

  it('cancels the audit and keeps it in the listing', async () => {
    const app = createApp();
    const { body: created } = await request(app).post('/audits').send(base);

    expect((await request(app).delete(`/audits/${created.id}`)).status).toBe(204);

    const detail = await request(app).get(`/audits/${created.id}`);
    expect(detail.body.estado).toBe('CANCELADA');
    expect((await request(app).get('/audits')).body).toHaveLength(1);
  });

  it('returns 404 for a missing audit', async () => {
    expect((await request(createApp()).delete('/audits/nope')).status).toBe(404);
  });

  it('rejects cancelling an already cancelled audit', async () => {
    const app = createApp();
    const { body: created } = await request(app).post('/audits').send(base);
    await request(app).delete(`/audits/${created.id}`);

    expect((await request(app).delete(`/audits/${created.id}`)).status).toBe(409);
  });

  it('frees the slot: a new audit can take a cancelled one\'s place', async () => {
    const app = createApp();
    const { body: created } = await request(app).post('/audits').send(base);
    await request(app).delete(`/audits/${created.id}`);

    expect((await request(app).post('/audits').send(base)).status).toBe(201);
  });
});

describe('PUT /audits/:id', () => {
  const base = { fechaHora: '2027-03-10T10:00:00', cliente: 'acme', tecnico: 'Ana Ruiz' };

  async function createAudit(app: ReturnType<typeof createApp>, body = base) {
    const res = await request(app).post('/audits').send(body);
    expect(res.status).toBe(201);
    return res.body;
  }

  it('updates a pending audit', async () => {
    const app = createApp();
    const created = await createAudit(app);

    const res = await request(app)
      .put(`/audits/${created.id}`)
      .send({ fechaHora: '2027-03-10T12:00:00', cliente: 'acme', tecnico: 'Ana Ruiz' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.id,
      fechaHora: '2027-03-10T12:00:00',
      estado: 'PENDIENTE',
    });
  });

  it('does not clash with itself when keeping the same slot', async () => {
    const app = createApp();
    const created = await createAudit(app);

    const res = await request(app).put(`/audits/${created.id}`).send(base);
    expect(res.status).toBe(200);
  });

  it('rejects an update that overlaps another audit', async () => {
    const app = createApp();
    await createAudit(app);
    const other = await createAudit(app, { ...base, fechaHora: '2027-03-10T12:00:00' });

    const res = await request(app)
      .put(`/audits/${other.id}`)
      .send({ ...base, fechaHora: '2027-03-10T10:30:00' });
    expect(res.status).toBe(409);
  });

  it('confirms a pending audit via estado: CONFIRMADA', async () => {
    const app = createApp();
    const created = await createAudit(app);

    const res = await request(app)
      .put(`/audits/${created.id}`)
      .send({ ...base, estado: 'CONFIRMADA' });
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('CONFIRMADA');
  });

  it('rejects editing a confirmed audit', async () => {
    const app = createApp();
    const created = await createAudit(app);
    await request(app).put(`/audits/${created.id}`).send({ ...base, estado: 'CONFIRMADA' });

    const res = await request(app)
      .put(`/audits/${created.id}`)
      .send({ ...base, fechaHora: '2027-03-10T12:00:00' });
    expect(res.status).toBe(409);
  });

  it('rejects any update on a cancelled audit', async () => {
    const app = createApp();
    const created = await createAudit(app);
    await request(app).delete(`/audits/${created.id}`);

    const res = await request(app).put(`/audits/${created.id}`).send(base);
    expect(res.status).toBe(409);
  });

  it('returns 404 for a missing audit', async () => {
    expect((await request(createApp()).put('/audits/nope').send(base)).status).toBe(404);
  });

  it.each([
    ['missing fields', { cliente: 'acme' }],
    ['estado CANCELADA (cancel via DELETE)', { ...base, estado: 'CANCELADA' }],
  ])('rejects invalid body: %s', async (_name, body) => {
    const app = createApp();
    const created = await createAudit(app);
    expect((await request(app).put(`/audits/${created.id}`).send(body)).status).toBe(400);
  });
});
