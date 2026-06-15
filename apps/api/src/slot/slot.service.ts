import { Injectable, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

interface SlotRule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  break_between: number;
  mode: string;
  date_range: { from: string; to: string } | null;
  is_active: number;
}

@Injectable()
export class SlotService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async findByDoctor(doctorId: string, date?: string) {
    let query = this.database.db.selectFrom("slot").selectAll().where("doctor_id", "=", doctorId);

    if (date) {
      query = query.where("date", "=", new Date(date));
    }

    return query.orderBy("date", "asc").orderBy("start_time", "asc").execute();
  }

  async findAvailable(doctorId: string, fromDate?: string, toDate?: string) {
    let query = this.database.db
      .selectFrom("slot")
      .selectAll()
      .where("doctor_id", "=", doctorId)
      .where("status", "=", "open");

    if (fromDate) {
      query = query.where("date", ">=", new Date(fromDate));
    }
    if (toDate) {
      query = query.where("date", "<=", new Date(toDate));
    }

    return query.orderBy("date", "asc").orderBy("start_time", "asc").execute();
  }

  // SLOT RULES

  async getRules(doctorId: string) {
    return this.database.db
      .selectFrom("slot_rule")
      .selectAll()
      .where("doctor_id", "=", doctorId)
      .where("is_active", "=", 1)
      .orderBy("day_of_week", "asc")
      .orderBy("start_time", "asc")
      .execute();
  }

  async createRule(
    doctorId: string,
    data: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDuration?: number;
      breakBetween?: number;
      mode?: string;
      dateRange?: { from: string; to: string };
    }
  ) {
    const rule = await this.database.db
      .insertInto("slot_rule")
      .values({
        doctor_id: doctorId,
        day_of_week: data.dayOfWeek,
        start_time: data.startTime,
        end_time: data.endTime,
        slot_duration: data.slotDuration ?? 30,
        break_between: data.breakBetween ?? 5,
        mode: data.mode ?? "video",
        date_range: data.dateRange ? JSON.stringify(data.dateRange) : null,
        is_active: 1,
      })
      .returningAll()
      .executeTakeFirst();

    return rule;
  }

  async updateRule(
    ruleId: string,
    data: Partial<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDuration: number;
      breakBetween: number;
      mode: string;
      isActive: boolean;
    }>
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.dayOfWeek !== undefined) updateData.day_of_week = data.dayOfWeek;
    if (data.startTime !== undefined) updateData.start_time = data.startTime;
    if (data.endTime !== undefined) updateData.end_time = data.endTime;
    if (data.slotDuration !== undefined) updateData.slot_duration = data.slotDuration;
    if (data.breakBetween !== undefined) updateData.break_between = data.breakBetween;
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.isActive !== undefined) updateData.is_active = data.isActive ? 1 : 0;
    updateData.updated_at = new Date();

    const rule = await this.database.db
      .updateTable("slot_rule")
      .set(updateData)
      .where("id", "=", ruleId)
      .returningAll()
      .executeTakeFirst();

    if (!rule) throw new NotFoundException("Rule not found");
    return rule;
  }

  async deleteRule(ruleId: string) {
    const rule = await this.database.db
      .deleteFrom("slot_rule")
      .where("id", "=", ruleId)
      .returningAll()
      .executeTakeFirst();

    if (!rule) throw new NotFoundException("Rule not found");
    return rule;
  }

  // SLOT OVERRIDES

  async getOverrides(doctorId: string, fromDate?: string, toDate?: string) {
    let query = this.database.db
      .selectFrom("slot_override")
      .selectAll()
      .where("doctor_id", "=", doctorId);

    if (fromDate) {
      query = query.where("date", ">=", fromDate);
    }
    if (toDate) {
      query = query.where("date", "<=", toDate);
    }

    return query.orderBy("date", "asc").execute();
  }

  async createOverride(doctorId: string, data: { date: string; reason?: string }) {
    const override = await this.database.db
      .insertInto("slot_override")
      .values({
        doctor_id: doctorId,
        date: data.date,
      })
      .returningAll()
      .executeTakeFirst();

    return override;
  }

  async deleteOverride(overrideId: string) {
    const override = await this.database.db
      .deleteFrom("slot_override")
      .where("id", "=", overrideId)
      .returningAll()
      .executeTakeFirst();

    if (!override) throw new NotFoundException("Override not found");
    return override;
  }

  // SLOT GENERATION ENGINE

  async generateSlots(doctorId: string): Promise<{ created: number; deleted: number }> {
    const rules = await this.getRules(doctorId);
    const overrides = await this.getOverrides(doctorId);

    const overrideDates = new Set(overrides.map((o) => o.date!));

    const futureSlots = await this.database.db
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
      const sDate =
        s.date instanceof Date
          ? s.date.toISOString().split("T")[0]!
          : new Date(s.date).toISOString().split("T")[0]!;
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
        if (current.getDay() !== rule.day_of_week) {
          current.setDate(current.getDate() + 1);
          continue;
        }

        const dateStr = current.toISOString().split("T")[0]!;

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
        const breakTime = rule.break_between;

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
              date: new Date(dateStr),
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
        const sDate =
          s.date instanceof Date
            ? s.date.toISOString().split("T")[0]!
            : new Date(s.date).toISOString().split("T")[0]!;
        return !desiredKeys.has(`${sDate}|${s.start_time}`);
      })
      .map((s) => s.id);

    let deleted = 0;
    if (slotIdsToDelete.length > 0) {
      const result = await this.database.db
        .deleteFrom("slot")
        .where("id", "in", slotIdsToDelete)
        .execute();
      deleted = result.length ?? 0;
    }

    let created = 0;
    if (slotsToCreate.length > 0) {
      for (let i = 0; i < slotsToCreate.length; i += 50) {
        const batch = slotsToCreate.slice(i, i + 50);
        const result = await this.database.db.insertInto("slot").values(batch).execute();
        created += result.length ?? 0;
      }
    }

    return { created, deleted };
  }

  async cleanupPastSlots(): Promise<number> {
    const result = await this.database.db
      .updateTable("slot")
      .set({ status: "closed", updated_at: new Date() })
      .where("status", "in", ["open", "held"])
      .where("date", "<", new Date())
      .execute();

    return result.length ?? 0;
  }
}
