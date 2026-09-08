import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('/tasks', () => {
  it('creates and lists tasks', async () => {
    const app = createApp();
    const created = await request(app).post('/tasks').send({ title: 'Buy milk' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: 'Buy milk', completed: false });

    const list = await request(app).get('/tasks');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
  });

  it('rejects a task without title', async () => {
    const res = await request(createApp()).post('/tasks').send({});
    expect(res.status).toBe(400);
  });

  it('completes a task', async () => {
    const app = createApp();
    const { body: task } = await request(app).post('/tasks').send({ title: 'Ship it' });

    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  it('returns 404 for a missing task', async () => {
    const res = await request(createApp()).get('/tasks/nope');
    expect(res.status).toBe(404);
  });

  it('deletes a task', async () => {
    const app = createApp();
    const { body: task } = await request(app).post('/tasks').send({ title: 'Temp' });

    expect((await request(app).delete(`/tasks/${task.id}`)).status).toBe(204);
    expect((await request(app).get(`/tasks/${task.id}`)).status).toBe(404);
  });
});
