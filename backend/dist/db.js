import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured. Copy .env.example to .env and update it.');
}
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
export async function ensureDatabase() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS tournament_state (
      id TEXT PRIMARY KEY,
      state JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      version BIGINT NOT NULL DEFAULT 1
    )
  `);
    await pool.query(`
    ALTER TABLE tournament_state
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 1
  `);
}
