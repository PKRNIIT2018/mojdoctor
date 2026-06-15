import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("doctor").addColumn("google_refresh_token", "text").execute();

  await db.schema.alterTable("doctor").addColumn("google_email", "varchar(255)").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("doctor").dropColumn("google_refresh_token").execute();
  await db.schema.alterTable("doctor").dropColumn("google_email").execute();
}
