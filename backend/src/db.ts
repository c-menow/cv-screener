import pg from "pg";
import config from "./config";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

export function closePool(): Promise<void> {
  return pool.end();
}
