import { randomUUID } from 'node:crypto';
import { Audit } from './audit.entity.js';
import type { AuditRepository } from './audit.repository.js';

export class AuditNotFoundError extends Error {
  constructor(id: string) {
    super(`Audit ${id} not found`);
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

  createAudit(dateTime: Date, client: string, technician: string): Promise<Audit> {
    return this.repository.save(new Audit(randomUUID(), dateTime, client, technician));
  }
}
