import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

// One pool per process. `next dev` loads this module separately for many routes, and each copy
// opening its own pool exhausts small poolers (Supabase's session pooler allows 15 clients).
const globalForDb = globalThis as unknown as { mastyfDb?: Db };

/** True when DATABASE_URL is configured for the cloud control plane. */
export function cloudDbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() || process.env.NODE_ENV !== 'production');
}

/**
 * Transaction-mode poolers (Supabase/Supavisor on port 6543, PgBouncer) hand each query to any
 * backend connection, so prepared statements must be off there.
 */
export function usesTransactionPooler(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return url.port === '6543' || url.searchParams.get('pgbouncer') === 'true';
  } catch {
    return false;
  }
}

export function getDb(): Db {
  if (globalForDb.mastyfDb) return globalForDb.mastyfDb;
  const connectionString =
    process.env.DATABASE_URL?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'postgres://rudraneeldas@localhost:5432/mastyf_cloud' : '');
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for the cloud control plane');
  }
  const client = postgres(connectionString, {
    // Serverless functions each hold their own pool, so keep it small; a pooler fans out.
    max: process.env.VERCEL ? 1 : 5,
    prepare: !usesTransactionPooler(connectionString),
  });
  globalForDb.mastyfDb = drizzle(client, { schema });
  return globalForDb.mastyfDb;
}
