import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const DOCTOR_EMAIL = "admin@onlineconsult.com";
const DOCTOR_PASSWORD = "P@ssw0rd@Admin";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is missing");
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
    );
    process.exit(1);
  }

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: databaseUrl }),
    }),
  });

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Check if auth user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users.find((u) => u.email === DOCTOR_EMAIL);
  if (existing) {
    console.log(`Auth user ${DOCTOR_EMAIL} already exists (id=${existing.id})`);
  }

  // 2. Create auth user
  const authUserId = existing
    ? existing.id
    : await (async () => {
        const { data, error } = await supabase.auth.admin.createUser({
          email: DOCTOR_EMAIL,
          password: DOCTOR_PASSWORD,
          email_confirm: true,
          user_metadata: { role: "admin" },
        });
        if (error) {
          console.error("Failed to create auth user:", error.message);
          await db.destroy();
          process.exit(1);
        }
        console.log(`Created auth user ${DOCTOR_EMAIL} (id=${data.user.id})`);
        return data.user.id;
      })();

  // 3. Upsert doctor record
  const existingDoctor = await db
    .selectFrom("doctor")
    .select("id")
    .where("email", "=", DOCTOR_EMAIL)
    .executeTakeFirst();

  if (existingDoctor) {
    console.log(`Doctor record for ${DOCTOR_EMAIL} already exists (id=${existingDoctor.id})`);
  } else {
    await db
      .insertInto("doctor")
      .values({
        id: authUserId,
        email: DOCTOR_EMAIL,
        name: "Admin Doctor",
        role: "admin",
        language: "en",
      })
      .execute();
    console.log(`Created doctor record for ${DOCTOR_EMAIL}`);
  }

  await db.destroy();
  console.log("\nSeed complete. Login with:");
  console.log(`  Email:    ${DOCTOR_EMAIL}`);
  console.log(`  Username: admin (appends @onlineconsult.com)`);
  console.log(`  Password: ${DOCTOR_PASSWORD}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
