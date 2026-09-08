import { randomUUID } from 'node:crypto';
import { Task } from './task.entity.js';
import type { TaskRepository } from './task.repository.js';

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task ${id} not found`);
  }
}

export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  listTasks(): Promise<Task[]> {
    return this.repository.findAll();
  }

  async getTask(id: string): Promise<Task> {
    const task = await this.repository.findById(id);
    if (!task) throw new TaskNotFoundError(id);
    return task;
  }

  createTask(title: string): Promise<Task> {
    return this.repository.save(new Task(randomUUID(), title));
  }

  async completeTask(id: string): Promise<Task> {
    const task = await this.getTask(id);
    task.complete();
    return this.repository.save(task);
  }

  async deleteTask(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new TaskNotFoundError(id);
  }
}
