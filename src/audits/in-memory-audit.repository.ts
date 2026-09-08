import type { Audit } from './audit.entity.js';
import type { AuditRepository } from './audit.repository.js';

export class InMemoryAuditRepository implements AuditRepository {
  private readonly audits = new Map<string, Audit>();

  async findAll(): Promise<Audit[]> {
    return [...this.audits.values()];
  }

  async findById(id: string): Promise<Audit | null> {
    return this.audits.get(id) ?? null;
  }

  async save(audit: Audit): Promise<Audit> {
    this.audits.set(audit.id, audit);
    return audit;
  }
}
