import { createKyselyClient } from "@repo/db";
import type { Database } from "@repo/db";
import { Kysely } from "kysely";

let _db: Kysely<Database> | null = null;

export function getDb(): Kysely<Database> {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    _db = createKyselyClient(databaseUrl);
  }
  return _db;
}

export async function closeDb() {
  if (_db) {
    await _db.destroy();
    _db = null;
  }
}
