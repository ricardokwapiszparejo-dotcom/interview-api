export type AuditStatus = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';

const AUDIT_DURATION_MS = 60 * 60 * 1000;

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
  overlapsWith(other: Audit): boolean {
    return this.dateTime < other.endsAt && other.dateTime < this.endsAt;
  }
}
