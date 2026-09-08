import type { Task } from './task.entity.js';
import type { TaskRepository } from './task.repository.js';

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  async findAll(): Promise<Task[]> {
    return [...this.tasks.values()];
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async save(task: Task): Promise<Task> {
    this.tasks.set(task.id, task);
    return task;
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }
}
