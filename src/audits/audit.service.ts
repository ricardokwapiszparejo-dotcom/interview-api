import { randomUUID } from 'node:crypto';
import { Audit } from './audit.entity.js';
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
  constructor(private readonly repository: AuditRepository) {}

  listAudits(): Promise<Audit[]> {
    return this.repository.findAll();
  }

  async getAudit(id: string): Promise<Audit> {
    const audit = await this.repository.findById(id);
    if (!audit) throw new AuditNotFoundError(id);
    return audit;
  }

  async createAudit(dateTime: Date, client: string, technician: string): Promise<Audit> {
    const audit = new Audit(randomUUID(), dateTime, client, technician);
    await this.ensureNoOverlap(audit);
    return this.repository.save(audit);
  }

  // Rules 1.1-1.3: same technician or same client, cancelled audits do not block.
  private async ensureNoOverlap(candidate: Audit, excludeId?: string): Promise<void> {
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
