import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/apply-migration.mjs <path-to-sql-file>');
  process.exit(1);
}

const sql = readFileSync(file, 'utf8');
const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log(`Applied: ${file}`);
} catch (e) {
  console.error(`FAILED (${file}):`, e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
