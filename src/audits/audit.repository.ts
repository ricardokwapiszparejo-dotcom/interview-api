import type { Audit } from './audit.entity.js';

export interface AuditRepository {
  findAll(): Promise<Audit[]>;
  findById(id: string): Promise<Audit | null>;
  save(audit: Audit): Promise<Audit>;
}
