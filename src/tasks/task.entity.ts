export class Task {
  constructor(
    public readonly id: string,
    public title: string,
    public completed: boolean = false,
  ) {}

  complete(): void {
    this.completed = true;
  }
}
