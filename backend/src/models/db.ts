import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const isDev = process.env.NODE_ENV !== 'production';

function log(msg: string, meta?: any) {
  if (isDev) console.log(`[DB] ${msg}`, meta ?? '');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'greenbus',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
  process.exit(-1);
});

// ─── Query Helpers ─────────────────────────────────────────────────────────────

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    log('Executed query', { text: text.slice(0, 80), duration: Date.now() - start, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error', { text: text.slice(0, 80), error });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  const originalRelease = client.release.bind(client);

  const timeout = setTimeout(() => {
    console.error('Client checkout over 5 seconds — possible leak!');
  }, 5000);

  (client as any).release = () => {
    clearTimeout(timeout);
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
}

// ─── Transaction Helper ────────────────────────────────────────────────────────

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    (client as any).release();
  }
}

export async function testConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('[DB] Connection established');
  } finally {
    client.release();
  }
}

export default pool;
