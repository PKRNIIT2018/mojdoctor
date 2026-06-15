import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class ComplianceService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async anonymizePatientData(doctorId: string, olderThanDays: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const anonymized: { bookingIds: string[]; caseFileIds: string[] } = {
      bookingIds: [],
      caseFileIds: [],
    };

    const oldBookings = await this.database.db
      .selectFrom("booking")
      .select(["id"])
      .where("doctor_id", "=", doctorId)
      .where("created_at", "<", cutoff)
      .where("patient_name", "!=", "[anonymized]")
      .execute();

    for (const b of oldBookings) {
      await this.database.db
        .updateTable("booking")
        .set({
          patient_name: "[anonymized]",
          patient_email: "[anonymized]",
          patient_phone: null,
          reason: null,
          document_pin: null,
          updated_at: new Date(),
        })
        .where("id", "=", b.id)
        .execute();
      anonymized.bookingIds.push(b.id);

      await this.database.db
        .updateTable("case_file")
        .set({
          patient_name: "[anonymized]",
          patient_email: "[anonymized]",
          updated_at: new Date(),
        })
        .where("booking_id", "=", b.id)
        .execute();
    }

    const affectedCaseFiles = await this.database.db
      .selectFrom("case_file")
      .select(["id"])
      .where("doctor_id", "=", doctorId)
      .where("updated_at", "<", cutoff)
      .where("patient_name", "!=", "[anonymized]")
      .execute();

    for (const cf of affectedCaseFiles) {
      if (!anonymized.caseFileIds.includes(cf.id)) {
        anonymized.caseFileIds.push(cf.id);
      }
    }

    await this.database.db
      .insertInto("audit_log")
      .values({
        entity_type: "compliance",
        entity_id: doctorId,
        action: "anonymize",
        actor_id: doctorId,
        changes: JSON.stringify({
          olderThanDays,
          cutoff: cutoff.toISOString(),
          bookingsAnonymized: anonymized.bookingIds.length,
          caseFilesAnonymized: anonymized.caseFileIds.length,
        }),
      })
      .execute();

    return {
      message: `Anonymized ${anonymized.bookingIds.length} booking(s) and ${anonymized.caseFileIds.length} case file(s)`,
      bookingsAnonymized: anonymized.bookingIds.length,
      caseFilesAnonymized: anonymized.caseFileIds.length,
    };
  }

  async exportPatientData(email: string) {
    const bookings = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("patient_email", "=", email)
      .execute();

    if (bookings.length === 0) {
      throw new NotFoundException("No data found for this email");
    }

    const bookingIds = bookings.map((b) => b.id);

    const caseFiles = await this.database.db
      .selectFrom("case_file")
      .selectAll()
      .where("patient_email", "=", email)
      .execute();

    const caseFileIds = caseFiles.map((cf) => cf.id);

    const [notes, documents, intakeResponses, feedbacks, payments] = await Promise.all([
      caseFileIds.length > 0
        ? this.database.db
            .selectFrom("doctor_note")
            .selectAll()
            .where("case_file_id", "in", caseFileIds)
            .execute()
        : [],
      caseFileIds.length > 0
        ? this.database.db
            .selectFrom("case_file_document")
            .selectAll()
            .where("case_file_id", "in", caseFileIds)
            .execute()
        : [],
      bookingIds.length > 0
        ? this.database.db
            .selectFrom("intake_response")
            .selectAll()
            .where("booking_id", "in", bookingIds)
            .execute()
        : [],
      bookingIds.length > 0
        ? this.database.db
            .selectFrom("feedback")
            .selectAll()
            .where("booking_id", "in", bookingIds)
            .execute()
        : [],
      bookingIds.length > 0
        ? this.database.db
            .selectFrom("payment")
            .selectAll()
            .where("booking_id", "in", bookingIds)
            .execute()
        : [],
    ]);

    return {
      exportedAt: new Date().toISOString(),
      patientEmail: email,
      bookings: bookings.map(({ document_pin, ...rest }) => rest),
      caseFiles,
      notes,
      documents,
      intakeResponses,
      feedbacks,
      payments,
    };
  }

  async deletePatientData(email: string) {
    const bookings = await this.database.db
      .selectFrom("booking")
      .select(["id"])
      .where("patient_email", "=", email)
      .execute();

    if (bookings.length === 0) {
      throw new NotFoundException("No data found for this email");
    }

    const bookingIds = bookings.map((b) => b.id);

    const caseFiles = await this.database.db
      .selectFrom("case_file")
      .select(["id"])
      .where("patient_email", "=", email)
      .execute();

    const caseFileIds = caseFiles.map((cf) => cf.id);

    await this.database.db.deleteFrom("feedback").where("booking_id", "in", bookingIds).execute();

    await this.database.db.deleteFrom("payment").where("booking_id", "in", bookingIds).execute();

    await this.database.db
      .deleteFrom("intake_response")
      .where("booking_id", "in", bookingIds)
      .execute();

    if (caseFileIds.length > 0) {
      await this.database.db
        .deleteFrom("doctor_note")
        .where("case_file_id", "in", caseFileIds)
        .execute();

      await this.database.db
        .deleteFrom("case_file_document")
        .where("case_file_id", "in", caseFileIds)
        .execute();
    }

    await this.database.db.deleteFrom("case_file").where("patient_email", "=", email).execute();

    await this.database.db.deleteFrom("booking").where("patient_email", "=", email).execute();

    await this.database.db
      .insertInto("audit_log")
      .values({
        entity_type: "compliance",
        entity_id: email,
        action: "erasure",
        actor_id: null,
        changes: JSON.stringify({
          bookingsDeleted: bookingIds.length,
          caseFilesDeleted: caseFileIds.length,
        }),
      })
      .execute();

    return {
      message: `Permanently deleted data for ${email}`,
      bookingsDeleted: bookingIds.length,
      caseFilesDeleted: caseFileIds.length,
    };
  }

  async getStats(doctorId: string) {
    const totalBookings = await this.database.db
      .selectFrom("booking")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("doctor_id", "=", doctorId)
      .executeTakeFirst();

    const anonymizedBookings = await this.database.db
      .selectFrom("booking")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("doctor_id", "=", doctorId)
      .where("patient_name", "=", "[anonymized]")
      .executeTakeFirst();

    const oldestBooking = await this.database.db
      .selectFrom("booking")
      .select("created_at")
      .where("doctor_id", "=", doctorId)
      .orderBy("created_at", "asc")
      .limit(1)
      .executeTakeFirst();

    const totalWithPII = Number(totalBookings?.count ?? 0) - Number(anonymizedBookings?.count ?? 0);

    return {
      totalBookings: Number(totalBookings?.count ?? 0),
      anonymizedBookings: Number(anonymizedBookings?.count ?? 0),
      activeRecordsWithPII: totalWithPII,
      oldestRecord: oldestBooking?.created_at ?? null,
      retentionPeriodDays: 365,
    };
  }
}
