import "server-only";

import { env } from "cloudflare:workers";
import { Client } from "pg";

// Workers cannot reuse a socket across requests, so each checkout opens a
// client and closes it on release. Hyperdrive pools the database connections.
export const pool = {
  async connect() {
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString,
      connectionTimeoutMillis: 10_000,
    });
    await client.connect();
    return Object.assign(client, {
      release: () => void client.end().catch(() => {}),
    });
  },
  async end() {},
};
