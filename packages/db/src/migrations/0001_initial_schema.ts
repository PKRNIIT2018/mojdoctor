import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Doctor table
  await db.schema
    .createTable("doctor")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("name", "varchar(255)")
    .addColumn("specialty", "varchar(255)")
    .addColumn("licence_number", "varchar(255)")
    .addColumn("clinic_name", "varchar(255)")
    .addColumn("clinic_address", "varchar(500)")
    .addColumn("practice_phone", "varchar(50)")
    .addColumn("language", "varchar(10)", (col) => col.defaultTo("en"))
    .addColumn("dpa_accepted_at", "timestamp")
    .addColumn("dpa_version", "varchar(50)")
    .addColumn("notification_prefs", "jsonb", (col) => col.defaultTo(sql`'{}'::jsonb`))
    .addColumn("stripe_account_id", "varchar(255)")
    .addColumn("stripe_onboarded", "boolean", (col) => col.defaultTo(false))
    .addColumn("note_template_config", "jsonb")
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 2. Slot table
  await db.schema
    .createTable("slot")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("doctor_id", "uuid", (col) => col.notNull().references("doctor.id"))
    .addColumn("date", "timestamp", (col) => col.notNull())
    .addColumn("start_time", "varchar(10)", (col) => col.notNull())
    .addColumn("end_time", "varchar(10)", (col) => col.notNull())
    .addColumn("mode", "varchar(20)", (col) => col.defaultTo("video").notNull())
    .addColumn("status", "varchar(30)", (col) => col.defaultTo("open").notNull())
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 3. Booking table
  await db.schema
    .createTable("booking")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("slot_id", "uuid", (col) => col.notNull().references("slot.id"))
    .addColumn("doctor_id", "uuid", (col) => col.notNull().references("doctor.id"))
    .addColumn("patient_name", "varchar(255)", (col) => col.notNull())
    .addColumn("patient_email", "varchar(255)", (col) => col.notNull())
    .addColumn("patient_phone", "varchar(50)")
    .addColumn("reason", "text")
    .addColumn("payment_method", "varchar(20)", (col) => col.defaultTo("card").notNull())
    .addColumn("status", "varchar(40)", (col) => col.defaultTo("PENDING_REVIEW").notNull())
    .addColumn("gdpr_consent", "varchar(10)", (col) => col.defaultTo("granted").notNull())
    .addColumn("language", "varchar(10)", (col) => col.defaultTo("en"))
    .addColumn("document_pin", "varchar(255)")
    .addColumn("video_room_url", "varchar(500)")
    .addColumn("current_state_entered_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 4. Payment table
  await db.schema
    .createTable("payment")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("booking_id", "uuid", (col) => col.notNull().references("booking.id"))
    .addColumn("stripe_setup_intent_id", "varchar(255)")
    .addColumn("stripe_payment_intent_id", "varchar(255)")
    .addColumn("stripe_customer_id", "varchar(255)")
    .addColumn("amount", "integer")
    .addColumn("currency", "varchar(10)", (col) => col.defaultTo("eur"))
    .addColumn("status", "varchar(30)", (col) => col.defaultTo("pending").notNull())
    .addColumn("captured_at", "timestamp")
    .addColumn("refunded_at", "timestamp")
    .addColumn("refund_amount", "integer")
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 5. Case File table
  await db.schema
    .createTable("case_file")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("booking_id", "uuid", (col) => col.notNull().references("booking.id"))
    .addColumn("doctor_id", "uuid", (col) => col.notNull().references("doctor.id"))
    .addColumn("patient_name", "varchar(255)", (col) => col.notNull())
    .addColumn("patient_email", "varchar(255)", (col) => col.notNull())
    .addColumn("folder_path", "varchar(500)")
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 6. Doctor Note table
  await db.schema
    .createTable("doctor_note")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("case_file_id", "uuid", (col) => col.notNull().references("case_file.id"))
    .addColumn("content_markdown", "text")
    .addColumn("sections", "jsonb")
    .addColumn("summary", "text")
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 7. Case File Document table
  await db.schema
    .createTable("case_file_document")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("case_file_id", "uuid", (col) => col.notNull().references("case_file.id"))
    .addColumn("file_name", "varchar(255)", (col) => col.notNull())
    .addColumn("file_size", "integer")
    .addColumn("mime_type", "varchar(100)")
    .addColumn("r2_key", "varchar(500)")
    .addColumn("category", "varchar(50)")
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 8. Intake Response table
  await db.schema
    .createTable("intake_response")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("booking_id", "uuid", (col) => col.notNull().references("booking.id"))
    .addColumn("responses", "jsonb", (col) => col.notNull())
    .addColumn("submitted_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 9. Pre Consult Template table
  await db.schema
    .createTable("pre_consult_template")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("doctor_id", "uuid", (col) => col.notNull().references("doctor.id"))
    .addColumn("title", "varchar(255)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("questions", "jsonb", (col) => col.notNull())
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true))
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 10. Prescription table
  await db.schema
    .createTable("prescription")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("doctor_note_id", "uuid", (col) => col.notNull().references("doctor_note.id"))
    .addColumn("medication_name", "varchar(255)", (col) => col.notNull())
    .addColumn("dosage", "varchar(255)", (col) => col.notNull())
    .addColumn("instructions", "text")
    .addColumn("valid_until", "date")
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 11. Feedback table
  await db.schema
    .createTable("feedback")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("booking_id", "uuid", (col) => col.notNull().references("booking.id"))
    .addColumn("rating", "integer")
    .addColumn("comment", "text")
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 12. Message Template table
  await db.schema
    .createTable("message_template")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("doctor_id", "uuid", (col) => col.notNull().references("doctor.id"))
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("subject", "varchar(255)")
    .addColumn("body_markdown", "text")
    .addColumn("event", "varchar(50)")
    .addColumn("is_default", "boolean", (col) => col.defaultTo(false))
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 13. Audit Log table
  await db.schema
    .createTable("audit_log")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("entity_type", "varchar(50)", (col) => col.notNull())
    .addColumn("entity_id", "varchar(255)")
    .addColumn("action", "varchar(50)", (col) => col.notNull())
    .addColumn("actor_id", "varchar(255)")
    .addColumn("changes", "jsonb")
    .addColumn("ip_address", "varchar(50)")
    .addColumn("user_agent", "text")
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 14. Slot Rule table
  await db.schema
    .createTable("slot_rule")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("doctor_id", "uuid", (col) => col.notNull().references("doctor.id"))
    .addColumn("day_of_week", "integer", (col) => col.notNull())
    .addColumn("start_time", "varchar(10)", (col) => col.notNull())
    .addColumn("end_time", "varchar(10)", (col) => col.notNull())
    .addColumn("slot_duration", "integer", (col) => col.defaultTo(30).notNull())
    .addColumn("break_between", "integer", (col) => col.defaultTo(0))
    .addColumn("mode", "varchar(20)", (col) => col.defaultTo("video"))
    .addColumn("date_range", "jsonb")
    .addColumn("is_active", "integer", (col) => col.defaultTo(1))
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // 15. Slot Override table
  await db.schema
    .createTable("slot_override")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("doctor_id", "uuid", (col) => col.notNull().references("doctor.id"))
    .addColumn("date", "date", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamp", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("slot_override").ifExists().execute();
  await db.schema.dropTable("slot_rule").ifExists().execute();
  await db.schema.dropTable("audit_log").ifExists().execute();
  await db.schema.dropTable("message_template").ifExists().execute();
  await db.schema.dropTable("feedback").ifExists().execute();
  await db.schema.dropTable("prescription").ifExists().execute();
  await db.schema.dropTable("pre_consult_template").ifExists().execute();
  await db.schema.dropTable("intake_response").ifExists().execute();
  await db.schema.dropTable("case_file_document").ifExists().execute();
  await db.schema.dropTable("doctor_note").ifExists().execute();
  await db.schema.dropTable("case_file").ifExists().execute();
  await db.schema.dropTable("payment").ifExists().execute();
  await db.schema.dropTable("booking").ifExists().execute();
  await db.schema.dropTable("slot").ifExists().execute();
  await db.schema.dropTable("doctor").ifExists().execute();
}
