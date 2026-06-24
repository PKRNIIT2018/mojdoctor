import { inngest } from "../client";
import { getDb } from "../database";

export const generateSlots = inngest.createFunction(
  { id: "generate-slots", name: "Generate Slots (180-day rolling)" },
  { cron: "0 2 * * *" },
  async ({ step }) => {
    const db = getDb();

    const result = await step.run("generate-all-doctor-slots", async () => {
      const doctors = await db.selectFrom("doctor").select(["id"]).execute();

      let totalCreated = 0;
      let totalDeleted = 0;

      for (const doctor of doctors) {
        const res = await generateForDoctor(db, doctor.id);
        totalCreated += res.created;
        totalDeleted += res.deleted;
      }

      return { doctorsProcessed: doctors.length, totalCreated, totalDeleted };
    });

    return {
      message: `Generated slots for ${result.doctorsProcessed} doctors`,
      created: result.totalCreated,
      deleted: result.totalDeleted,
    };
  }
);

async function generateForDoctor(
  db: ReturnType<typeof getDb>,
  doctorId: string
): Promise<{ created: number; deleted: number }> {
  const rules = await db
    .selectFrom("slot_rule")
    .selectAll()
    .where("doctor_id", "=", doctorId)
    .where("is_active", "=", 1)
    .orderBy("day_of_week", "asc")
    .orderBy("start_time", "asc")
    .execute();

  const overrides = await db
    .selectFrom("slot_override")
    .select(["date"])
    .where("doctor_id", "=", doctorId)
    .execute();

  const overrideDates = new Set(overrides.map((o) => o.date));

  const futureSlots = await db
    .selectFrom("slot")
    .select(["id", "date", "start_time"])
    .where("doctor_id", "=", doctorId)
    .where("status", "=", "open")
    .where("date", ">=", new Date())
    .execute();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 180);

  const existingByKey = new Map<string, string>();
  for (const s of futureSlots) {
    const d = s.date instanceof Date ? s.date : new Date(s.date);
    const sDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    existingByKey.set(`${sDate}|${s.start_time}`, s.id);
  }

  const desiredKeys = new Set<string>();
  const slotsToCreate: Array<{
    doctor_id: string;
    date: Date;
    start_time: string;
    end_time: string;
    mode: string;
  }> = [];

  for (const rule of rules) {
    const current = new Date(today);

    while (current <= maxDate) {
      // UI stores day_of_week as 0=Monday … 6=Sunday (ISO weekday).
      // Date.getDay() uses 0=Sunday … 6=Saturday, so we convert:
      const localDow = (current.getDay() + 6) % 7;
      if (localDow !== rule.day_of_week) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      // Use local calendar date (not UTC) to avoid day-shift in UTC+ timezones
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      if (overrideDates.has(dateStr)) {
        current.setDate(current.getDate() + 1);
        continue;
      }

      if (rule.date_range) {
        const range =
          typeof rule.date_range === "string"
            ? (JSON.parse(rule.date_range) as { from: string; to: string })
            : rule.date_range;
        if (dateStr < range.from || dateStr > range.to) {
          current.setDate(current.getDate() + 1);
          continue;
        }
      }

      const startParts = rule.start_time.split(":").map(Number);
      const endParts = rule.end_time.split(":").map(Number);
      const startMinutes = (startParts[0] ?? 0) * 60 + (startParts[1] ?? 0);
      const endMinutes = (endParts[0] ?? 0) * 60 + (endParts[1] ?? 0);
      const duration = rule.slot_duration;
      const breakTime = rule.break_between ?? 0;

      let slotStart = startMinutes;
      while (slotStart + duration <= endMinutes) {
        const slotEnd = slotStart + duration;
        const startStr = `${String(Math.floor(slotStart / 60)).padStart(2, "0")}:${String(slotStart % 60).padStart(2, "0")}`;
        const endStr = `${String(Math.floor(slotEnd / 60)).padStart(2, "0")}:${String(slotEnd % 60).padStart(2, "0")}`;

        const key = `${dateStr}|${startStr}`;
        desiredKeys.add(key);

        if (!existingByKey.has(key)) {
          slotsToCreate.push({
            doctor_id: doctorId,
            date: new Date(`${dateStr}T12:00:00`),
            start_time: startStr,
            end_time: endStr,
            mode: rule.mode,
          });
        }

        slotStart = slotEnd + breakTime;
      }

      current.setDate(current.getDate() + 1);
    }
  }

  const slotIdsToDelete = futureSlots
    .filter((s) => {
      const d = s.date instanceof Date ? s.date : new Date(s.date);
      const sDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return !desiredKeys.has(`${sDate}|${s.start_time}`);
    })
    .map((s) => s.id);

  let deleted = 0;
  if (slotIdsToDelete.length > 0) {
    const result = await db.deleteFrom("slot").where("id", "in", slotIdsToDelete).execute();
    deleted = result.length ?? 0;
  }

  let created = 0;
  if (slotsToCreate.length > 0) {
    for (let i = 0; i < slotsToCreate.length; i += 50) {
      const batch = slotsToCreate.slice(i, i + 50);
      const result = await db.insertInto("slot").values(batch).execute();
      created += result.length ?? 0;
    }
  }

  return { created, deleted };
}
