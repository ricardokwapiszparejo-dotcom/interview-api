import { randomUUID } from 'node:crypto';
import {
  Audit,
  AUDIT_DURATION_MS,
  InvalidStateTransitionError,
} from './audit.entity.js';
import type { AuditRepository } from './audit.repository.js';

export class AuditNotFoundError extends Error {
  constructor(id: string) {
    super(`Audit ${id} not found`);
  }
}

export class OverlappingAuditError extends Error {
  constructor() {
    super('Audit overlaps with an existing one for the same technician or client');
  }
}

export class AuditService {
  constructor(
    private readonly repository: AuditRepository,
    // Injectable clock: the slot search starts at "now"; tests pin it for determinism.
    private readonly now: () => Date = () => new Date(),
  ) {}

  listAudits(): Promise<Audit[]> {
    return this.repository.findAll();
  }

  async getAudit(id: string): Promise<Audit> {
    const audit = await this.repository.findById(id);
    if (!audit) throw new AuditNotFoundError(id);
    return audit;
  }

  // The slot is derived from the busy agenda, so it is free by construction: no post-check needed.
  async createAudit(client: string, technician: string): Promise<Audit> {
    const dateTime = await this.findFirstFreeSlot(technician, client);
    return this.repository.save(new Audit(randomUUID(), dateTime, client, technician));
  }

  // Full replacement of the editable fields; the slot is kept, so the new
  // technician/client pair must be revalidated against the rest of the agenda.
  async updateAudit(id: string, client: string, technician: string, confirm: boolean): Promise<Audit> {
    const audit = await this.getAudit(id);
    if (audit.status !== 'PENDIENTE') throw new InvalidStateTransitionError(audit.status, 'edit');
    const candidate = new Audit(audit.id, audit.dateTime, client, technician);
    await this.ensureNoOverlap(candidate, audit.id);
    audit.update(client, technician);
    if (confirm) audit.confirm();
    return this.repository.save(audit);
  }

  async cancelAudit(id: string): Promise<void> {
    const audit = await this.getAudit(id);
    audit.cancel();
    await this.repository.save(audit);
  }

  // Gap walk over the busy intervals of the technician or client (rules 1.1-1.3),
  // starting at now(). Exclusive boundary: a slot may start exactly when one ends.
  private async findFirstFreeSlot(technician: string, client: string): Promise<Date> {
    const busy = (await this.repository.findAll())
      .filter(
        (a) =>
          a.status !== 'CANCELADA' && (a.technician === technician || a.client === client),
      )
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

    let candidate = this.now();
    for (const audit of busy) {
      if (candidate.getTime() + AUDIT_DURATION_MS <= audit.dateTime.getTime()) break;
      if (audit.endsAt > candidate) candidate = audit.endsAt;
    }
    return candidate;
  }

  private async ensureNoOverlap(candidate: Audit, excludeId: string): Promise<void> {
    const audits = await this.repository.findAll();
    const clashes = audits.some(
      (other) =>
        other.id !== excludeId &&
        other.status !== 'CANCELADA' &&
        (other.technician === candidate.technician || other.client === candidate.client) &&
        other.overlapsWith(candidate),
    );
    if (clashes) throw new OverlappingAuditError();
  }
}
