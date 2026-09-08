import { Router, type Response } from 'express';
import { InvalidStateTransitionError, type Audit } from './audit.entity.js';
import { AuditNotFoundError, OverlappingAuditError, type AuditService } from './audit.service.js';

// The wire format keeps the Spanish field names from the spec; the domain stays in English.
function toResponse(audit: Audit) {
  return {
    id: audit.id,
    fechaHora: toLocalIso(audit.dateTime),
    cliente: audit.client,
    tecnico: audit.technician,
    estado: audit.status,
  };
}

// Single-timezone spec: serialize as local ISO without offset, mirroring the input format.
function toLocalIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

interface ParsedBody {
  dateTime: Date;
  client: string;
  technician: string;
  confirm: boolean;
}

// POST rejects estado outright; PUT accepts PENDIENTE (no-op) or CONFIRMADA. Cancelling goes through DELETE.
function parseBody(body: unknown, allowStatus: boolean): ParsedBody | null {
  const { fechaHora, cliente, tecnico, estado } = (body ?? {}) as Record<string, unknown>;
  if (!allowStatus && estado !== undefined) return null;
  if (allowStatus && estado !== undefined && estado !== 'PENDIENTE' && estado !== 'CONFIRMADA')
    return null;
  if (typeof fechaHora !== 'string' || typeof cliente !== 'string' || typeof tecnico !== 'string')
    return null;
  if (cliente.trim() === '' || tecnico.trim() === '') return null;
  const dateTime = new Date(fechaHora);
  if (Number.isNaN(dateTime.getTime())) return null;
  return { dateTime, client: cliente.trim(), technician: tecnico.trim(), confirm: estado === 'CONFIRMADA' };
}

export function auditsRouter(service: AuditService): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json((await service.listAudits()).map(toResponse));
  });

  router.get('/:id', async (req, res) => {
    try {
      res.json(toResponse(await service.getAudit(req.params.id)));
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/', async (req, res) => {
    const parsed = parseBody(req.body, false);
    if (!parsed) {
      res.status(400).json({ error: 'fechaHora (ISO8601), cliente and tecnico are required; estado is not accepted' });
      return;
    }
    try {
      const audit = await service.createAudit(parsed.dateTime, parsed.client, parsed.technician);
      res.status(201).json(toResponse(audit));
    } catch (err) {
      handleError(err, res);
    }
  });

  router.put('/:id', async (req, res) => {
    const parsed = parseBody(req.body, true);
    if (!parsed) {
      res.status(400).json({ error: 'fechaHora (ISO8601), cliente and tecnico are required; estado may only be PENDIENTE or CONFIRMADA' });
      return;
    }
    try {
      const audit = await service.updateAudit(
        req.params.id,
        parsed.dateTime,
        parsed.client,
        parsed.technician,
        parsed.confirm,
      );
      res.json(toResponse(audit));
    } catch (err) {
      handleError(err, res);
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await service.cancelAudit(req.params.id);
      res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}

function handleError(err: unknown, res: Response): void {
  if (err instanceof AuditNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof OverlappingAuditError || err instanceof InvalidStateTransitionError) {
    res.status(409).json({ error: err.message });
    return;
  }
  throw err;
}
