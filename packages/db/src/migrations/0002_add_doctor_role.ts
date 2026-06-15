import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("doctor")
    .addColumn("role", "varchar(20)", (col) => col.defaultTo("doctor").notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("doctor").dropColumn("role").execute();
}
