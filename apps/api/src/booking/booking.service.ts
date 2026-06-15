import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpException,
  Inject,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { StateMachineService } from "./state-machine.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class BookingService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StateMachineService) private readonly stateMachine: StateMachineService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService
  ) {}

  async create(data: {
    slotId: string;
    doctorId: string;
    patientName: string;
    patientEmail: string;
    patientPhone?: string;
    reason?: string;
    paymentMethod?: string;
    language?: string;
    gdprConsent?: string;
    documentPin?: string;
  }) {
    const { booking: createdBooking, returningPatient } = await this.database.db
      .transaction()
      .execute(async (trx) => {
        const slot = await trx
          .selectFrom("slot")
          .selectAll()
          .where("id", "=", data.slotId)
          .forUpdate()
          .executeTakeFirst();

        if (!slot) {
          throw new NotFoundException("Slot not found");
        }

        if (slot.status !== "open") {
          throw new BadRequestException("SLOT_TAKEN");
        }

        if (slot.date < new Date()) {
          throw new BadRequestException("Slot is in the past");
        }

        const existingBooking = await trx
          .selectFrom("booking")
          .select(["patient_name", "document_pin"])
          .where("patient_email", "=", data.patientEmail)
          .orderBy("created_at", "desc")
          .limit(1)
          .executeTakeFirst();

        const returningPatient = !!existingBooking;

        const booking = await trx
          .insertInto("booking")
          .values({
            slot_id: data.slotId,
            doctor_id: data.doctorId,
            patient_name: data.patientName,
            patient_email: data.patientEmail,
            patient_phone: data.patientPhone ?? null,
            reason: data.reason ?? null,
            payment_method: data.paymentMethod ?? "card",
            language: data.language ?? "en",
            gdpr_consent: data.gdprConsent ?? "granted",
            document_pin: data.documentPin
              ? await this.hashPin(data.documentPin)
              : returningPatient && existingBooking.document_pin
                ? existingBooking.document_pin
                : null,
            status: "PENDING_REVIEW",
          })
          .returningAll()
          .executeTakeFirst();

        return { booking, returningPatient };
      });

    this.notifications
      .sendBookingConfirmation(createdBooking!.id, data.patientEmail, data.patientName)
      .catch(() => {});

    this.notifications
      .sendNewBookingAlert(createdBooking!.id, data.doctorId, data.patientName)
      .catch(() => {});

    return { booking: createdBooking, returningPatient };
  }

  async updatePaymentMethod(bookingId: string, paymentMethod: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.status !== "PENDING_REVIEW") {
      throw new BadRequestException("Can only change payment method on PENDING_REVIEW bookings");
    }
    if (booking.payment_method === paymentMethod) {
      return { booking };
    }

    const now = new Date();
    await this.database.db
      .updateTable("booking")
      .set({ payment_method: paymentMethod, updated_at: now })
      .where("id", "=", bookingId)
      .execute();

    await this.database.db.deleteFrom("payment").where("booking_id", "=", bookingId).execute();

    await this.database.db
      .insertInto("audit_log")
      .values({
        entity_type: "booking",
        entity_id: bookingId,
        action: "booking:payment_method_changed",
        actor_id: "patient",
        changes: JSON.stringify({
          payment_method: { from: booking.payment_method, to: paymentMethod },
        }),
      })
      .execute();

    return { booking: { ...booking, payment_method: paymentMethod } };
  }

  async approve(bookingId: string, paymentNote?: string, actor?: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    const newState = booking.payment_method === "other" ? "CONFIRMED" : "AWAITING_CARD";

    await this.stateMachine.transitionTo(bookingId, newState as any, { actor });

    const caseFile = await this.database.db
      .insertInto("case_file")
      .values({
        booking_id: bookingId,
        doctor_id: booking.doctor_id,
        patient_name: booking.patient_name,
        patient_email: booking.patient_email,
      })
      .returningAll()
      .executeTakeFirst();

    this.notifications
      .sendBookingApproved(bookingId, booking.patient_email, booking.patient_name, "Doctor")
      .catch(() => {});

    this.notifications
      .sendIntakeEmail(bookingId, booking.patient_email, booking.patient_name)
      .catch(() => {});

    return { booking: { ...booking, status: newState }, caseFile };
  }

  async approveAsAgreed(bookingId: string, internalNote?: string, actor?: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.payment_method !== "other" && booking.payment_method !== "as_agreed") {
      throw new BadRequestException("Payment method must be 'other' or 'as_agreed'");
    }

    await this.stateMachine.transitionTo(bookingId, "CONFIRMED" as any, { actor });

    const caseFile = await this.database.db
      .insertInto("case_file")
      .values({
        booking_id: bookingId,
        doctor_id: booking.doctor_id,
        patient_name: booking.patient_name,
        patient_email: booking.patient_email,
      })
      .returningAll()
      .executeTakeFirst();

    this.notifications
      .sendBookingApproved(bookingId, booking.patient_email, booking.patient_name, "Doctor")
      .catch(() => {});

    this.notifications
      .sendIntakeEmail(bookingId, booking.patient_email, booking.patient_name)
      .catch(() => {});

    return { booking: { ...booking, status: "CONFIRMED" }, caseFile };
  }

  async postpone(bookingId: string, alternativeSlotIds: string[], actor?: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    const slots = await this.database.db
      .selectFrom("slot")
      .selectAll()
      .where("id", "in", alternativeSlotIds)
      .where("status", "=", "open")
      .execute();

    if (slots.length !== alternativeSlotIds.length) {
      throw new BadRequestException("Some alternative slots are not available");
    }

    await this.stateMachine.transitionTo(bookingId, "AWAITING_PATIENT_RESCHEDULE" as any, {
      actor,
    });

    return { booking: { ...booking, status: "AWAITING_PATIENT_RESCHEDULE" } };
  }

  async reject(bookingId: string, reason: string, actor?: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    await this.stateMachine.transitionTo(bookingId, "REJECTED" as any, { actor });

    this.notifications
      .sendBookingRejected(bookingId, booking.patient_email, booking.patient_name, reason)
      .catch(() => {});

    return { booking: { ...booking, status: "REJECTED" }, reason };
  }

  async patientReschedule(bookingId: string, selectedSlotId: string, patientEmail?: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");
    if (patientEmail && booking.patient_email.toLowerCase() !== patientEmail.toLowerCase()) {
      throw new ForbiddenException("Email does not match booking");
    }
    if (booking.status !== "AWAITING_PATIENT_RESCHEDULE") {
      throw new BadRequestException("Booking is not awaiting patient reschedule");
    }

    const slot = await this.database.db
      .selectFrom("slot")
      .selectAll()
      .where("id", "=", selectedSlotId)
      .where("status", "=", "open")
      .executeTakeFirst();

    if (!slot) throw new BadRequestException("Selected slot is not available");

    await this.stateMachine.transitionTo(bookingId, "AWAITING_DOCTOR_REAPPROVAL" as any, {
      actor: "patient",
    });

    return { booking: { ...booking, status: "AWAITING_DOCTOR_REAPPROVAL" } };
  }

  async cancelByPatient(bookingId: string, patientEmail?: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");
    if (patientEmail && booking.patient_email.toLowerCase() !== patientEmail.toLowerCase()) {
      throw new ForbiddenException("Email does not match booking");
    }

    await this.stateMachine.transitionTo(bookingId, "CANCELLED_BY_PATIENT" as any, {
      actor: "patient",
    });

    this.notifications
      .sendCancellationNotification(
        bookingId,
        booking.patient_email,
        booking.patient_name,
        "patient"
      )
      .catch(() => {});

    return { message: "Booking cancelled" };
  }

  async cancelByDoctor(bookingId: string, actor?: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    await this.stateMachine.transitionTo(bookingId, "CANCELLED_BY_DOCTOR" as any, { actor });

    this.notifications
      .sendCancellationNotification(
        bookingId,
        booking.patient_email,
        booking.patient_name,
        "doctor"
      )
      .catch(() => {});

    return { message: "Booking cancelled by doctor" };
  }

  async complete(bookingId: string, actor?: string) {
    await this.stateMachine.transitionTo(bookingId, "COMPLETED" as any, { actor });

    const booking = await this.database.db
      .selectFrom("booking")
      .innerJoin("doctor", "doctor.id", "booking.doctor_id")
      .leftJoin("case_file", "case_file.booking_id", "booking.id")
      .select([
        "booking.patient_name",
        "booking.patient_email",
        "doctor.name as doctor_name",
        "case_file.id as case_file_id",
      ])
      .where("booking.id", "=", bookingId)
      .executeTakeFirst();

    if (booking) {
      let summary: string | undefined;
      let hasPrescription = false;

      if (booking.case_file_id) {
        const note = await this.database.db
          .selectFrom("doctor_note")
          .select(["summary"])
          .where("case_file_id", "=", booking.case_file_id)
          .orderBy("created_at", "desc")
          .limit(1)
          .executeTakeFirst();

        if (note?.summary) {
          summary = note.summary;
        }

        const rxCount = await this.database.db
          .selectFrom("prescription")
          .innerJoin("doctor_note", "doctor_note.id", "prescription.doctor_note_id")
          .where("doctor_note.case_file_id", "=", booking.case_file_id)
          .select((eb) => eb.fn.countAll<number>().as("count"))
          .executeTakeFirst();

        hasPrescription = Number(rxCount?.count || 0) > 0;
      }

      this.notifications
        .sendPostConsultSummary(
          bookingId,
          booking.patient_email,
          booking.patient_name,
          booking.doctor_name ?? "",
          summary,
          hasPrescription
        )
        .catch(() => {});
    }

    return { message: "Consultation completed" };
  }

  async markNoShow(bookingId: string, actor?: string) {
    await this.stateMachine.transitionTo(bookingId, "NO_SHOW" as any, { actor });
    return { message: "Patient marked as no-show" };
  }

  async findByDoctor(doctorId: string) {
    return this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("doctor_id", "=", doctorId)
      .orderBy("created_at", "desc")
      .execute();
  }

  async getConsultations(doctorId: string, status?: string) {
    let query = this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .leftJoin("case_file", "case_file.booking_id", "booking.id")
      .select([
        "booking.id as booking_id",
        "booking.patient_name",
        "booking.patient_email",
        "booking.patient_phone",
        "booking.reason",
        "booking.payment_method",
        "booking.status",
        "booking.language",
        "booking.gdpr_consent",
        "booking.created_at as booking_created_at",
        "slot.date",
        "slot.start_time",
        "slot.end_time",
        "slot.mode",
        "case_file.id as case_file_id",
        "booking.video_room_url",
      ])
      .where("booking.doctor_id", "=", doctorId);

    if (status) {
      query = query.where("booking.status", "=", status);
    }

    return query.orderBy("slot.date", "desc").orderBy("slot.start_time", "desc").execute();
  }

  async findByStatus(status: string) {
    return this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("status", "=", status)
      .orderBy("created_at", "desc")
      .execute();
  }

  async findPendingReview() {
    return this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("status", "=", "PENDING_REVIEW")
      .orderBy("created_at", "asc")
      .execute();
  }

  async findByPatient(email: string) {
    return this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("patient_email", "=", email)
      .orderBy("created_at", "desc")
      .execute();
  }

  async getPatientHistory(email: string, doctorId: string) {
    return this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .leftJoin("case_file", "case_file.booking_id", "booking.id")
      .select([
        "booking.id as booking_id",
        "booking.patient_name",
        "booking.patient_email",
        "booking.patient_phone",
        "booking.reason",
        "booking.payment_method",
        "booking.status",
        "booking.language",
        "booking.gdpr_consent",
        "booking.created_at as booking_created_at",
        "slot.date",
        "slot.start_time",
        "slot.end_time",
        "slot.mode",
        "case_file.id as case_file_id",
      ])
      .where("booking.patient_email", "=", email)
      .where("booking.doctor_id", "=", doctorId)
      .orderBy("slot.date", "desc")
      .orderBy("slot.start_time", "desc")
      .execute();
  }

  async findOne(id: string) {
    return this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .selectAll("booking")
      .select(["slot.date", "slot.start_time", "slot.end_time", "slot.mode"])
      .where("booking.id", "=", id)
      .executeTakeFirstOrThrow();
  }

  async search(query: string) {
    return this.database.db
      .selectFrom("booking")
      .selectAll()
      .where((eb) =>
        eb.or([
          eb("patient_name", "ilike", `%${query}%`),
          eb("patient_email", "ilike", `%${query}%`),
          eb("patient_phone", "ilike", `%${query}%`),
        ])
      )
      .orderBy("created_at", "desc")
      .limit(20)
      .execute();
  }

  async getBookingsByDateRange(doctorId: string, from: Date, to: Date) {
    return this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .selectAll("booking")
      .select(["slot.date", "slot.start_time", "slot.end_time", "slot.mode"])
      .where("booking.doctor_id", "=", doctorId)
      .where("slot.date", ">=", from)
      .where("slot.date", "<=", to)
      .orderBy("slot.date", "asc")
      .orderBy("slot.start_time", "asc")
      .execute();
  }

  private async hashPin(pin: string): Promise<string> {
    const { hash } = await import("bcrypt");
    return hash(pin, 10);
  }

  async verifyDocumentPin(bookingId: string, pin: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .leftJoin("case_file", "case_file.booking_id", "booking.id")
      .leftJoin("doctor_note", "doctor_note.case_file_id", "case_file.id")
      .select([
        "booking.document_pin",
        "booking.pin_attempts",
        "booking.pin_locked_until",
        "doctor_note.summary",
      ])
      .where("booking.id", "=", bookingId)
      .executeTakeFirst();

    if (!booking || !booking.document_pin) {
      throw new NotFoundException("Booking not found or no documents available");
    }

    if (booking.pin_locked_until && new Date(booking.pin_locked_until) > new Date()) {
      throw new HttpException("PIN locked — too many failed attempts. Try again later.", 429);
    }

    const { compare } = await import("bcrypt");
    const valid = await compare(pin, booking.document_pin);

    if (!valid) {
      const attempts = (booking.pin_attempts ?? 0) + 1;
      if (attempts >= 5) {
        await this.database.db
          .updateTable("booking")
          .set({
            pin_attempts: attempts,
            pin_locked_until: new Date(Date.now() + 15 * 60 * 1000),
          })
          .where("booking.id", "=", bookingId)
          .execute();
        throw new HttpException("PIN locked — too many failed attempts. Try again later.", 429);
      }

      await this.database.db
        .updateTable("booking")
        .set({ pin_attempts: attempts })
        .where("booking.id", "=", bookingId)
        .execute();

      return { valid: false, remainingAttempts: 5 - attempts };
    }

    await this.database.db
      .updateTable("booking")
      .set({ pin_attempts: 0, pin_locked_until: null })
      .where("booking.id", "=", bookingId)
      .execute();

    const prescriptions = await this.database.db
      .selectFrom("prescription")
      .innerJoin("doctor_note", "doctor_note.id", "prescription.doctor_note_id")
      .innerJoin("case_file", "case_file.id", "doctor_note.case_file_id")
      .where("case_file.booking_id", "=", bookingId)
      .select([
        "prescription.medication_name",
        "prescription.dosage",
        "prescription.instructions",
        "prescription.valid_until",
        "prescription.created_at",
      ])
      .execute();

    return {
      valid: true,
      summary: booking.summary ?? null,
      prescriptions: prescriptions.map((rx) => ({
        medicationName: rx.medication_name,
        dosage: rx.dosage,
        instructions: rx.instructions,
        validUntil: rx.valid_until,
        createdAt: rx.created_at,
      })),
    };
  }
}
