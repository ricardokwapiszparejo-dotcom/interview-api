import express, { type Express } from 'express';
import { tasksRouter } from './tasks/tasks.router.js';

// App factory kept separate from the listener so tests can build an instance without binding a port.
export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/tasks', tasksRouter());

  return app;
}
