import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { validateLibrary } from '../public/library-data.js';

const empty = () => ({ version: 1, documents: [], corrections: [] });
export class RevisionConflict extends Error {}

export function createLibraryDatabase({ url = process.env.DATABASE_URL, path = process.env.JARVIS_DATABASE_PATH || './data/jarvis.sqlite', production = process.env.NODE_ENV === 'production' } = {}) {
  let connection;
  let initializing;
  const kind = url ? 'postgresql' : production ? 'unconfigured' : 'sqlite';
  async function initialize() {
    if (connection) return connection;
    if (initializing) return initializing;
    initializing = (async () => {
      if (kind === 'unconfigured') throw new Error('Configura DATABASE_URL en Render para activar la biblioteca persistente.');
      if (kind === 'postgresql') {
        const { Pool } = await import('pg');
        const address = new URL(url);
        // Usar TLS por defecto sin desactivar la comprobación de certificados.
        // PostgreSQL dentro de una red privada puede indicar sslmode=disable.
        const ssl = address.searchParams.get('sslmode') === 'disable' ? false : { rejectUnauthorized: true };
        for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) address.searchParams.delete(key);
        const pool = new Pool({ connectionString: address.toString(), ssl, max: 3, connectionTimeoutMillis: 5000, query_timeout: 10000 });
        pool.on('error', () => { /* La siguiente petición devolverá un error sin datos de conexión. */ });
        try {
          await pool.query('CREATE TABLE IF NOT EXISTS jarvis_library (id INTEGER PRIMARY KEY CHECK (id = 1), payload JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 0)');
          await pool.query('INSERT INTO jarvis_library (id, payload, revision) VALUES (1, $1::jsonb, 0) ON CONFLICT (id) DO NOTHING', [JSON.stringify(empty())]);
          return connection = { kind, pool };
        } catch (error) { await pool.end(); throw error; }
      }
      if (path !== ':memory:') await mkdir(dirname(path), { recursive: true });
      const { DatabaseSync } = await import('node:sqlite');
      const db = new DatabaseSync(path);
      try {
        db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS jarvis_library (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)');
        db.prepare('INSERT OR IGNORE INTO jarvis_library (id, payload, revision) VALUES (1, ?, 0)').run(JSON.stringify(empty()));
        return connection = { kind, db };
      } catch (error) { db.close(); throw error; }
    })();
    try { return await initializing; } finally { initializing = null; }
  }
  return {
    kind,
    async read() {
      const store = await initialize();
      const row = store.kind === 'postgresql'
        ? (await store.pool.query('SELECT payload, revision FROM jarvis_library WHERE id = 1')).rows[0]
        : store.db.prepare('SELECT payload, revision FROM jarvis_library WHERE id = 1').get();
      return { library: validateLibrary(typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload), revision: row.revision, database: kind };
    },
    async write(library, expectedRevision) {
      const validated = validateLibrary(library);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new TypeError('La revisión de la biblioteca no es válida.');
      const store = await initialize();
      const data = JSON.stringify(validated);
      const row = store.kind === 'postgresql'
        ? (await store.pool.query('UPDATE jarvis_library SET payload = $1::jsonb, revision = revision + 1 WHERE id = 1 AND revision = $2 RETURNING revision', [data, expectedRevision])).rows[0]
        : store.db.prepare('UPDATE jarvis_library SET payload = ?, revision = revision + 1 WHERE id = 1 AND revision = ? RETURNING revision').get(data, expectedRevision);
      if (!row) throw new RevisionConflict('La biblioteca cambió en otro dispositivo. Recarga antes de guardar; tu cambio no se aplicó.');
      return { library: validated, revision: row.revision, database: kind };
    },
    async close() {
      if (initializing) { try { await initializing; } catch { /* Sin conexión que cerrar. */ } }
      const active = connection;
      connection = null;
      if (active?.pool) await active.pool.end();
      else active?.db.close();
    }
  };
}
