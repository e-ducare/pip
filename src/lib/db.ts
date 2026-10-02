import "server-only";

import { Pool } from "pg";
import { requiredEnv } from "./auth-env";

const globalForDb = globalThis as typeof globalThis & { dbPool?: Pool };

export const pool =
  globalForDb.dbPool ??
  new Pool({
    connectionString: requiredEnv("DATABASE_URL"),
    max: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  }).on("error", (error) => {
    // pg reports dropped idle connections here; an unhandled "error" event crashes Node.
    console.error("Database pool error", error.message);
  });

if (process.env.NODE_ENV !== "production") globalForDb.dbPool = pool;
