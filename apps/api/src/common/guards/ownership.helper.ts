import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { DatabaseService } from "../../database/database.service";

export async function assertBookingOwnership(
  db: DatabaseService,
  bookingId: string,
  doctorId: string
) {
  const booking = await db.db
    .selectFrom("booking")
    .select("doctor_id")
    .where("id", "=", bookingId)
    .executeTakeFirst();
  if (!booking) throw new NotFoundException("Booking not found");
  if (booking.doctor_id !== doctorId) throw new ForbiddenException();
}

export async function assertCaseFileOwnership(
  db: DatabaseService,
  caseFileId: string,
  doctorId: string
) {
  const file = await db.db
    .selectFrom("case_file")
    .select("doctor_id")
    .where("id", "=", caseFileId)
    .executeTakeFirst();
  if (!file) throw new NotFoundException("Case file not found");
  if (file.doctor_id !== doctorId) throw new ForbiddenException();
}

export async function assertNoteOwnership(db: DatabaseService, noteId: string, doctorId: string) {
  const note = await db.db
    .selectFrom("doctor_note")
    .innerJoin("case_file", "case_file.id", "doctor_note.case_file_id")
    .select("case_file.doctor_id")
    .where("doctor_note.id", "=", noteId)
    .executeTakeFirst();
  if (!note) throw new NotFoundException("Note not found");
  if (note.doctor_id !== doctorId) throw new ForbiddenException();
}

export async function assertPaymentOwnership(
  db: DatabaseService,
  paymentId: string,
  doctorId: string
) {
  const payment = await db.db
    .selectFrom("payment")
    .innerJoin("booking", "booking.id", "payment.booking_id")
    .select("booking.doctor_id")
    .where("payment.id", "=", paymentId)
    .executeTakeFirst();
  if (!payment) throw new NotFoundException("Payment not found");
  if (payment.doctor_id !== doctorId) throw new ForbiddenException();
}

export async function assertDocumentOwnership(
  db: DatabaseService,
  documentId: string,
  doctorId: string
) {
  const doc = await db.db
    .selectFrom("case_file_document")
    .innerJoin("case_file", "case_file.id", "case_file_document.case_file_id")
    .select("case_file.doctor_id")
    .where("case_file_document.id", "=", documentId)
    .executeTakeFirst();
  if (!doc) throw new NotFoundException("Document not found");
  if (doc.doctor_id !== doctorId) throw new ForbiddenException();
}
