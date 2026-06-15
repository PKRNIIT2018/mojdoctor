import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("booking").addColumn("calendar_event_id", "varchar(255)").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("booking").dropColumn("calendar_event_id").execute();
}
