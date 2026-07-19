import 'dotenv/config';
import { ensureDatabase, pool } from './db.js';

try {
  await ensureDatabase();
  console.log('Database table is ready.');
} finally {
  await pool.end();
}
