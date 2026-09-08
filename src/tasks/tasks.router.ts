import { Router, type Response } from 'express';
import { TaskNotFoundError, type TaskService } from './task.service.js';

export function tasksRouter(service: TaskService): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await service.listTasks());
  });

  router.post('/', async (req, res) => {
    const { title } = req.body ?? {};
    if (typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    res.status(201).json(await service.createTask(title.trim()));
  });

  router.get('/:id', async (req, res) => {
    try {
      res.json(await service.getTask(req.params.id));
    } catch (err) {
      handleError(err, res);
    }
  });

  router.patch('/:id/complete', async (req, res) => {
    try {
      res.json(await service.completeTask(req.params.id));
    } catch (err) {
      handleError(err, res);
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await service.deleteTask(req.params.id);
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}

function handleError(err: unknown, res: Response): void {
  if (err instanceof TaskNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  throw err;
}
