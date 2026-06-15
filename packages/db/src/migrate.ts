import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { Migrator, type Migration, type MigrationProvider } from "kysely/migration";
import { Database } from "./types";
import * as initialSchema from "./migrations/0001_initial_schema";
import * as addDoctorRole from "./migrations/0002_add_doctor_role";
import * as addPinLockout from "./migrations/0003_add_pin_lockout";
import * as addCalendarEventId from "./migrations/0004_add_calendar_event_id";
import * as addGoogleOauth from "./migrations/0005_add_google_oauth";

class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return {
      "0001_initial_schema": initialSchema,
      "0002_add_doctor_role": addDoctorRole,
      "0003_add_pin_lockout": addPinLockout,
      "0004_add_calendar_event_id": addCalendarEventId,
      "0005_add_google_oauth": addGoogleOauth,
    };
  }
}

async function migrateToLatest() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: databaseUrl,
        // Optional: config pool for serverless if needed
      }),
    }),
  });

  const migrator = new Migrator({
    db,
    provider: new StaticMigrationProvider(),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it: { status: string; migrationName: string }) => {
    if (it.status === "Success") {
      console.log(`migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("failed to migrate");
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

migrateToLatest().catch((err) => {
  console.error(err);
  process.exit(1);
});
