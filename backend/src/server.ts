import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { ensureDatabase, pool } from './db.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', async (_req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, service: 'jp-badminton-backend', database: 'connected' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/state', async (_req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT state, updated_at, version FROM tournament_state WHERE id = $1',
      ['main'],
    );
    const row = result.rows[0];
    res.json({ state: row?.state ?? null, updatedAt: row?.updated_at?.toISOString?.() ?? row?.updated_at ?? null, version: Number(row?.version ?? 0) });
  } catch (error) {
    next(error);
  }
});

const stateSchema = z.object({
  state: z.record(z.string(), z.unknown()),
  baseVersion: z.number().int().nonnegative().optional(),
});

app.put('/api/state', async (req, res, next) => {
  try {
    const parsed = stateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid tournament state', details: parsed.error.flatten() });
      return;
    }

    const existing = await pool.query(
      'SELECT state, updated_at, version FROM tournament_state WHERE id = $1',
      ['main'],
    );

    if (existing.rowCount === 0) {
      const created = await pool.query(
        `INSERT INTO tournament_state (id, state, updated_at, version)
         VALUES ($1, $2::jsonb, NOW(), 1)
         RETURNING updated_at, version`,
        ['main', JSON.stringify(parsed.data.state)],
      );
      const row = created.rows[0];
      res.json({ ok: true, updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at, version: Number(row.version) });
      return;
    }

    const current = existing.rows[0];
    const currentVersion = Number(current.version);
    if (parsed.data.baseVersion !== undefined && parsed.data.baseVersion !== currentVersion) {
      res.status(409).json({
        error: 'State changed in another window',
        state: current.state,
        updatedAt: current.updated_at?.toISOString?.() ?? current.updated_at,
        version: currentVersion,
      });
      return;
    }

    const result = await pool.query(
      `UPDATE tournament_state
       SET state = $2::jsonb, updated_at = NOW(), version = version + 1
       WHERE id = $1
       RETURNING updated_at, version`,
      ['main', JSON.stringify(parsed.data.state)],
    );

    const row = result.rows[0];
    res.json({ ok: true, updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at, version: Number(row.version) });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

await ensureDatabase();

const server = app.listen(port, () => {
  console.log(`JP Badminton backend running on http://localhost:${port}`);
});

const shutdown = async () => {
  server.close();
  await pool.end();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
