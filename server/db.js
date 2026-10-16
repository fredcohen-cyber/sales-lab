import pg from 'pg';

// Return DATE columns as 'YYYY-MM-DD' strings instead of local-midnight Date objects.
pg.types.setTypeParser(1082, (v) => v);
// int8 (count, bigserial) as JS numbers; values here stay far below 2^53.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));
// numeric as JS numbers (averages).
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

export function createDb(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 20_000,
    query_timeout: 25_000,
    application_name: 'sales-lab',
  });
  pool.on('error', (err) => {
    console.error('[db] idle client error', err.message);
  });

  const db = {
    pool,
    query(text, params) {
      return pool.query(text, params);
    },
    async one(text, params) {
      const { rows } = await pool.query(text, params);
      return rows[0] || null;
    },
    async many(text, params) {
      const { rows } = await pool.query(text, params);
      return rows;
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const helpers = wrapClient(client);
        const result = await fn(helpers);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* ignore rollback failure */
        }
        throw err;
      } finally {
        client.release();
      }
    },
    end() {
      return pool.end();
    },
  };
  return db;
}

function wrapClient(client) {
  return {
    client,
    query: (text, params) => client.query(text, params),
    one: async (text, params) => (await client.query(text, params)).rows[0] || null,
    many: async (text, params) => (await client.query(text, params)).rows,
  };
}
