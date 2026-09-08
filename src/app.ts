import express, { type Express } from 'express';
import { InMemoryAuditRepository } from './audits/in-memory-audit.repository.js';
import { AuditService } from './audits/audit.service.js';
import { auditsRouter } from './audits/audits.router.js';

// App factory kept separate from the listener so tests can build an instance without binding a port.
export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Composition root: the only place that knows concrete implementations.
  const auditService = new AuditService(new InMemoryAuditRepository());
  app.use('/audits', auditsRouter(auditService));

  return app;
}
