import { randomUUID } from 'node:crypto';
import { Audit } from './audit.entity.js';
import type { AuditRepository } from './audit.repository.js';

export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  createAudit(dateTime: Date, client: string, technician: string): Promise<Audit> {
    return this.repository.save(new Audit(randomUUID(), dateTime, client, technician));
  }
}
