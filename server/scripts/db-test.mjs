import 'dotenv/config';
import { Client } from 'pg';

const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  const tables = ['profiles', 'cookbooks', 'recipes', 'grocery_items', 'plan_entries'];
  for (const t of tables) {
    const cols = await client.query(
      `select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,
      [t]
    );
    console.log(`${t}:`, cols.rows.map((r) => r.column_name).join(', '));
  }
} catch (e) {
  console.error('CONNECTION FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
