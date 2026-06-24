import { Injectable, NotFoundException, Inject, ForbiddenException, Logger } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { NotificationsService } from "../notifications/notifications.service";
import { generatePrescriptionPdf, encryptPdfWithPin } from "@repo/prescription";
import { assertOwnership } from "../common/guards/ownership.helper";

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService
  ) {}

  async findByCaseFile(caseFileId: string, doctorId: string) {
    await assertOwnership(this.database, "case_file", caseFileId, doctorId);
    return this.database.db
      .selectFrom("doctor_note")
      .selectAll()
      .where("case_file_id", "=", caseFileId)
      .orderBy("created_at", "desc")
      .execute();
  }

  async findOne(id: string, doctorId?: string) {
    const note = await this.database.db
      .selectFrom("doctor_note")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!note) throw new NotFoundException("Note not found");
    if (doctorId) await assertOwnership(this.database, "note", id, doctorId);
    return note;
  }

  async create(data: {
    caseFileId: string;
    doctorId: string;
    contentMarkdown?: string;
    sections?: { heading: string; content: string }[];
    summary?: string;
  }) {
    await assertOwnership(this.database, "case_file", data.caseFileId, data.doctorId);
    return this.database.db
      .insertInto("doctor_note")
      .values({
        case_file_id: data.caseFileId,
        content_markdown: data.contentMarkdown ?? null,
        sections: data.sections ? JSON.stringify(data.sections) : null,
        summary: data.summary ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(
    id: string,
    doctorId: string,
    data: {
      contentMarkdown?: string;
      sections?: { heading: string; content: string }[];
      summary?: string;
    }
  ) {
    await assertOwnership(this.database, "note", id, doctorId);
    return this.database.db
      .updateTable("doctor_note")
      .set({
        ...(data.contentMarkdown !== undefined && { content_markdown: data.contentMarkdown }),
        ...(data.sections !== undefined && { sections: JSON.stringify(data.sections) }),
        ...(data.summary !== undefined && { summary: data.summary }),
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async delete(id: string, doctorId: string) {
    await assertOwnership(this.database, "note", id, doctorId);
    await this.database.db.deleteFrom("doctor_note").where("id", "=", id).execute();
    return { message: "Note deleted" };
  }

  async getPrescriptions(noteId: string, doctorId: string) {
    await assertOwnership(this.database, "note", noteId, doctorId);
    return this.database.db
      .selectFrom("prescription")
      .selectAll()
      .where("doctor_note_id", "=", noteId)
      .orderBy("created_at", "desc")
      .execute();
  }

  async addPrescription(data: {
    doctorNoteId: string;
    doctorId: string;
    medicationName: string;
    dosage: string;
    instructions?: string;
    validUntil?: string;
  }) {
    await assertOwnership(this.database, "note", data.doctorNoteId, data.doctorId);

    const prescription = await this.database.db
      .insertInto("prescription")
      .values({
        doctor_note_id: data.doctorNoteId,
        medication_name: data.medicationName,
        dosage: data.dosage,
        instructions: data.instructions ?? null,
        valid_until: data.validUntil ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    this.sendPrescriptionEmail(data.doctorNoteId, prescription).catch((err: unknown) =>
      this.logger.error(`sendPrescriptionEmail: ${err instanceof Error ? err.message : err}`)
    );

    return prescription;
  }

  private async sendPrescriptionEmail(doctorNoteId: string, prescription: any) {
    const note = await this.database.db
      .selectFrom("doctor_note")
      .innerJoin("case_file", "case_file.id", "doctor_note.case_file_id")
      .innerJoin("booking", "booking.id", "case_file.booking_id")
      .innerJoin("doctor", "doctor.id", "case_file.doctor_id")
      .select([
        "case_file.patient_name",
        "case_file.patient_email",
        "case_file.doctor_id",
        "doctor.name as doctor_name",
      ])
      .where("doctor_note.id", "=", doctorNoteId)
      .executeTakeFirst();

    if (!note) return;

    const pdfBuffer = await generatePrescriptionPdf({
      patientName: note.patient_name,
      patientEmail: note.patient_email,
      doctorName: note.doctor_name ?? "",
      medicationName: prescription.medication_name,
      dosage: prescription.dosage,
      instructions: prescription.instructions ?? undefined,
      validUntil: prescription.valid_until ?? undefined,
      issuedAt: new Date(),
      prescriptionId: prescription.id,
    });

    this.notifications
      .sendPrescriptionDelivery(
        note.doctor_id,
        note.patient_email,
        note.patient_name,
        prescription.medication_name,
        prescription.dosage,
        prescription.instructions ?? undefined,
        prescription.valid_until ?? undefined,
        {
          filename: `prescription-${prescription.id}.pdf`,
          content: pdfBuffer.toString("base64"),
        }
      )
      .catch((err: unknown) =>
        this.logger.error(`sendPrescriptionDelivery: ${err instanceof Error ? err.message : err}`)
      );
  }

  async removePrescription(prescriptionId: string, doctorId: string) {
    const rx = await this.database.db
      .selectFrom("prescription")
      .innerJoin("doctor_note", "doctor_note.id", "prescription.doctor_note_id")
      .innerJoin("case_file", "case_file.id", "doctor_note.case_file_id")
      .select(["prescription.id", "case_file.doctor_id"])
      .where("prescription.id", "=", prescriptionId)
      .executeTakeFirst();
    if (!rx) throw new NotFoundException("Prescription not found");
    if (rx.doctor_id !== doctorId) throw new ForbiddenException();
    await this.database.db.deleteFrom("prescription").where("id", "=", prescriptionId).execute();
    return { message: "Prescription removed" };
  }
}
