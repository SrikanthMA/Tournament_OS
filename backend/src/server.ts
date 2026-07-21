import 'dotenv/config';
import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { z } from 'zod';
import { ensureDatabase, pool } from './db.js';

const app = express();
const port = Number(process.env.PORT || 4000);

const allowedOrigins = (
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '5mb' }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`Socket.IO connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Socket.IO disconnected: ${socket.id}`);
  });
});

app.get('/api/health', async (_req, res, next) => {
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
});

app.get('/api/state', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT state, updated_at, version
      FROM tournament_state
      WHERE id = $1
      `,
      ['main'],
    );

    const row = result.rows[0];

    res.json({
      state: row?.state ?? null,
      updatedAt:
        row?.updated_at?.toISOString?.() ??
        row?.updated_at ??
        null,
      version: Number(row?.version ?? 0),
    });
  } catch (error) {
    next(error);
  }
});

const stateSchema = z.object({
  state: z.record(z.string(), z.unknown()),
  baseVersion: z.number().int().nonnegative(),
});

app.put('/api/state', async (req, res, next) => {
  const client = await pool.connect();

  try {
    const parsed = stateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid tournament state',
        details: parsed.error.flatten(),
      });
      return;
    }

    await client.query('BEGIN');

    const existing = await client.query(
      `
      SELECT state, updated_at, version
      FROM tournament_state
      WHERE id = $1
      FOR UPDATE
      `,
      ['main'],
    );

    if (existing.rowCount === 0) {
      if (parsed.data.baseVersion !== 0) {
        await client.query('ROLLBACK');

        res.status(409).json({
          error: 'State changed in another window',
          state: null,
          updatedAt: null,
          version: 0,
        });

        return;
      }

      const created = await client.query(
        `
        INSERT INTO tournament_state (
          id,
          state,
          updated_at,
          version
        )
        VALUES ($1, $2::jsonb, NOW(), 1)
        RETURNING updated_at, version
        `,
        ['main', JSON.stringify(parsed.data.state)],
      );

      await client.query('COMMIT');

      const row = created.rows[0];

      io.emit('state-updated', {
        updatedAt:
          row.updated_at?.toISOString?.() ??
          row.updated_at,
        version: Number(row.version),
      });

      res.json({
        ok: true,
        updatedAt:
          row.updated_at?.toISOString?.() ??
          row.updated_at,
        version: Number(row.version),
      });

      return;
    }

    const current = existing.rows[0];
    const currentVersion = Number(current.version);

    if (parsed.data.baseVersion !== currentVersion) {
      await client.query('ROLLBACK');

      res.status(409).json({
        error: 'State changed in another window',
        state: current.state,
        updatedAt:
          current.updated_at?.toISOString?.() ??
          current.updated_at,
        version: currentVersion,
      });

      return;
    }

    const result = await client.query(
      `
      UPDATE tournament_state
      SET
        state = $2::jsonb,
        updated_at = NOW(),
        version = version + 1
      WHERE id = $1
      RETURNING updated_at, version
      `,
      ['main', JSON.stringify(parsed.data.state)],
    );

    await client.query('COMMIT');

    const row = result.rows[0];

    io.emit('state-updated', {
      updatedAt:
        row.updated_at?.toISOString?.() ??
        row.updated_at,
      version: Number(row.version),
    });

    res.json({
      ok: true,
      updatedAt:
        row.updated_at?.toISOString?.() ??
        row.updated_at,
      version: Number(row.version),
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    next(error);
  } finally {
    client.release();
  }
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);

    if (
      error instanceof Error &&
      error.message.startsWith('CORS blocked')
    ) {
      res.status(403).json({
        error: error.message,
      });

      return;
    }

    res.status(500).json({
      error: 'Internal server error',
    });
  },
);

await ensureDatabase();

const server = httpServer.listen(port, () => {
  console.log(`JP Badminton backend running on port ${port}`);
});

const shutdown = async () => {
  io.close();

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);