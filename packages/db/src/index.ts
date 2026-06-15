import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { Database } from "./types";

export * from "./types";

export function createKyselyClient(connectionString: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }),
    }),
  });
}
