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
}
