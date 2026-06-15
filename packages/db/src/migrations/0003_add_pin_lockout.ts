import { Kysely } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("booking")
    .addColumn("pin_attempts", "integer", (col) => col.defaultTo(0).notNull())
    .execute();

  await db.schema.alterTable("booking").addColumn("pin_locked_until", "timestamptz").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("booking").dropColumn("pin_locked_until").execute();

  await db.schema.alterTable("booking").dropColumn("pin_attempts").execute();
}
