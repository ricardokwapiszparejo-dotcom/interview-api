import express, { type Express } from 'express';
import { fileURLToPath } from 'node:url';
import { InMemoryAuditRepository } from './audits/in-memory-audit.repository.js';
import { AuditService } from './audits/audit.service.js';
import { auditsRouter } from './audits/audits.router.js';

// App factory kept separate from the listener so tests can build an instance without binding a port.
export interface AppDeps {
  // Clock used for slot auto-assignment; tests pin it for determinism.
  now?: () => Date;
}

export function createApp(deps: AppDeps = {}): Express {
  const app = express();
  app.use(express.json());
  // Minimal test UI, served same-origin so no CORS setup is needed.
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Composition root: the only place that knows concrete implementations.
  const auditService = new AuditService(new InMemoryAuditRepository(), deps.now);
  app.use('/audits', auditsRouter(auditService));

  return app;
}
