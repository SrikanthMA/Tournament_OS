import 'dotenv/config';
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { ensureDatabase, pool } from './db.js';

const app = express();
const port = Number(process.env.PORT || 4000);

const allowedOrigins = (
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim());

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));

app.get(
  '/api/health',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await pool.query('SELECT 1');

      res.json({
        ok: true,
        service: 'jp-badminton-backend',
        database: 'connected',
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/state',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await pool.query(
        'SELECT state, updated_at FROM tournament_state WHERE id = $1',
        ['main'],
      );

      const row = result.rows[0];

      res.json({
        state: row?.state ?? null,
        updatedAt:
          row?.updated_at?.toISOString?.() ??
          row?.updated_at ??
          null,
      });
    } catch (error) {
      next(error);
    }
  },
);

const stateSchema = z.object({
  state: z.record(z.string(), z.unknown()),
});

app.put(
  '/api/state',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = stateSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid tournament state',
          details: parsed.error.flatten(),
        });
        return;
      }

      const result = await pool.query(
        `INSERT INTO tournament_state (id, state, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id)
         DO UPDATE SET
           state = EXCLUDED.state,
           updated_at = NOW()
         RETURNING updated_at`,
        ['main', JSON.stringify(parsed.data.state)],
      );

      const updatedAt = result.rows[0].updated_at;

      res.json({
        ok: true,
        updatedAt: updatedAt?.toISOString?.() ?? updatedAt,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error(error);

    res.status(500).json({
      error: 'Internal server error',
    });
  },
);

await ensureDatabase();

const server = app.listen(port, () => {
  console.log(`JP Badminton backend running on port ${port}`);
});

const shutdown = async (): Promise<void> => {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);