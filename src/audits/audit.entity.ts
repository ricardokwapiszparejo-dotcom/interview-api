export class InvalidStateTransitionError extends Error {
  constructor(status: AuditStatus, action: string) {
    super(`Cannot ${action} an audit in ${status} state`);
  }
}

export type AuditStatus = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';

export const AUDIT_DURATION_MS = 60 * 60 * 1000;

export class Audit {
  constructor(
    public readonly id: string,
    public dateTime: Date,
    public client: string,
    public technician: string,
    public status: AuditStatus = 'PENDIENTE',
  ) {}

  get endsAt(): Date {
    return new Date(this.dateTime.getTime() + AUDIT_DURATION_MS);
  }

  // Exclusive boundary: an audit ending at 11:00 does not clash with one starting at 11:00.
  // dateTime is system-assigned at creation and never edited from outside.
  update(client: string, technician: string): void {
    if (this.status !== 'PENDIENTE') throw new InvalidStateTransitionError(this.status, 'edit');
    this.client = client;
    this.technician = technician;
  }

  confirm(): void {
    if (this.status !== 'PENDIENTE') throw new InvalidStateTransitionError(this.status, 'confirm');
    this.status = 'CONFIRMADA';
  }

  cancel(): void {
    if (this.status === 'CANCELADA') throw new InvalidStateTransitionError(this.status, 'cancel');
    this.status = 'CANCELADA';
  }

  overlapsWith(other: Audit): boolean {
    return this.dateTime < other.endsAt && other.dateTime < this.endsAt;
  }
}
