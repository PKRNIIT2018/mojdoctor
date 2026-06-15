import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  BookingConfirmationEmail,
  BookingApprovedEmail,
  BookingRejectedEmail,
  ReminderEmail,
  PinMessageEmail,
  PreConsultIntakeEmail,
  CancellationNotificationEmail,
  PostConsultSummaryEmail,
  PrescriptionDeliveryEmail,
  FeedbackPromptEmail,
} from "@repo/email";
import { render } from "@react-email/render";
import { GoogleGmailService } from "../google/google-gmail.service";

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(GoogleGmailService) private readonly gmailService: GoogleGmailService
  ) {}

  // ---------- Template helpers ----------

  private renderTemplate(html: string, vars: Record<string, string>): string {
    return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
  }

  private async getCustomTemplate(doctorId: string, event: string) {
    return this.database.db
      .selectFrom("message_template")
      .selectAll()
      .where("doctor_id", "=", doctorId)
      .where("event", "=", event)
      .where("is_default", "=", true)
      .executeTakeFirst();
  }

  // ---------------------------------------

  async getTemplates(doctorId: string) {
    return this.database.db
      .selectFrom("message_template")
      .selectAll()
      .where("doctor_id", "=", doctorId)
      .orderBy("name", "asc")
      .execute();
  }

  async getTemplate(id: string) {
    const template = await this.database.db
      .selectFrom("message_template")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!template) throw new NotFoundException("Template not found");
    return template;
  }

  async createTemplate(data: {
    doctorId: string;
    name: string;
    subject?: string;
    bodyMarkdown?: string;
    event?: string;
    isDefault?: boolean;
  }) {
    return this.database.db
      .insertInto("message_template")
      .values({
        doctor_id: data.doctorId,
        name: data.name,
        subject: data.subject ?? null,
        body_markdown: data.bodyMarkdown ?? null,
        event: data.event ?? null,
        is_default: data.isDefault ?? false,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      subject?: string;
      bodyMarkdown?: string;
      event?: string;
      isDefault?: boolean;
    }
  ) {
    await this.getTemplate(id);
    return this.database.db
      .updateTable("message_template")
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.bodyMarkdown !== undefined && { body_markdown: data.bodyMarkdown }),
        ...(data.event !== undefined && { event: data.event }),
        ...(data.isDefault !== undefined && { is_default: data.isDefault }),
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteTemplate(id: string) {
    await this.getTemplate(id);
    await this.database.db.deleteFrom("message_template").where("id", "=", id).execute();
    return { message: "Template deleted" };
  }

  async send(data: {
    doctorId: string;
    to: string;
    subject: string;
    body: string;
    bookingId?: string;
  }) {
    await this.gmailService.sendMessage(data.doctorId, {
      to: data.to,
      subject: data.subject,
      htmlBody: data.body,
    });
    return { message: "Email sent", to: data.to, subject: data.subject, provider: "gmail" };
  }

  async sendBookingConfirmation(bookingId: string, patientEmail: string, patientName: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .innerJoin("doctor", "doctor.id", "booking.doctor_id")
      .selectAll("booking")
      .select(["slot.date", "slot.start_time", "slot.mode", "doctor.name as doctor_name"])
      .where("booking.id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    const dateStr =
      booking.date instanceof Date
        ? booking.date.toLocaleDateString()
        : new Date(booking.date).toLocaleDateString();

    const vars = {
      patient_name: patientName,
      date: dateStr,
      time: booking.start_time,
      booking_id: bookingId,
      clinic_name: (booking as any).doctor_name ?? "Doctor",
      mode: booking.mode,
    };

    const custom = await this.getCustomTemplate(booking.doctor_id, "booking_confirmation");
    let html: string;
    let subject: string;
    if (custom?.body_markdown) {
      html = this.renderTemplate(custom.body_markdown, vars);
      subject = custom.subject
        ? this.renderTemplate(custom.subject, vars)
        : "Consultation Confirmed";
    } else {
      html = await render(
        BookingConfirmationEmail({
          patientName,
          date: dateStr,
          time: booking.start_time,
          mode: booking.mode,
          bookingId,
          doctorName: vars.clinic_name,
        })
      );
      subject = "Consultation Confirmed";
    }

    await this.gmailService.sendMessage(booking.doctor_id, {
      to: patientEmail,
      subject,
      htmlBody: html,
    });
    return { message: "Confirmation sent", to: patientEmail, bookingId };
  }

  async sendBookingApproved(
    bookingId: string,
    patientEmail: string,
    patientName: string,
    doctorName: string
  ) {
    const booking = await this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .selectAll("booking")
      .select(["slot.date", "slot.start_time", "slot.mode"])
      .where("booking.id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    const dateStr =
      booking.date instanceof Date
        ? booking.date.toLocaleDateString()
        : new Date(booking.date).toLocaleDateString();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentUrl = `${appUrl}/book/payment/${bookingId}`;

    const vars = {
      patient_name: patientName,
      date: dateStr,
      time: booking.start_time,
      booking_id: bookingId,
      clinic_name: doctorName,
      mode: booking.mode,
      payment_url: paymentUrl,
    };
    const custom = await this.getCustomTemplate(booking.doctor_id, "booking_approved");
    let html: string;
    let subject: string;
    if (custom?.body_markdown) {
      html = this.renderTemplate(custom.body_markdown, vars);
      subject = custom.subject ? this.renderTemplate(custom.subject, vars) : "Booking Approved";
    } else {
      html = await render(
        BookingApprovedEmail({
          patientName,
          date: dateStr,
          time: booking.start_time,
          mode: booking.mode,
          bookingId,
          paymentUrl,
        })
      );
      subject = "Booking Approved - Please Complete Payment";
    }

    await this.gmailService.sendMessage(booking.doctor_id, {
      to: patientEmail,
      subject,
      htmlBody: html,
    });
    return { message: "Approval sent", to: patientEmail };
  }

  async sendBookingRejected(
    bookingId: string,
    patientEmail: string,
    patientName: string,
    reason?: string
  ) {
    const booking = await this.database.db
      .selectFrom("booking")
      .select("doctor_id")
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    const vars = { patient_name: patientName, booking_id: bookingId, reason: reason ?? "" };
    const custom = await this.getCustomTemplate(booking.doctor_id, "booking_rejected");
    let html: string;
    let subject: string;
    if (custom?.body_markdown) {
      html = this.renderTemplate(custom.body_markdown, vars);
      subject = custom.subject ? this.renderTemplate(custom.subject, vars) : "Booking Declined";
    } else {
      html = await render(BookingRejectedEmail({ patientName, bookingId, reason }));
      subject = "Booking Declined";
    }

    await this.gmailService.sendMessage(booking.doctor_id, {
      to: patientEmail,
      subject,
      htmlBody: html,
    });
    return { message: "Rejection sent", to: patientEmail };
  }

  async sendReminder(bookingId: string, patientEmail: string, patientName: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .selectAll("booking")
      .select(["slot.date", "slot.start_time", "slot.mode", "booking.video_room_url"])
      .where("booking.id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    const dateStr =
      booking.date instanceof Date
        ? booking.date.toLocaleDateString()
        : new Date(booking.date).toLocaleDateString();

    const vars = {
      patient_name: patientName,
      date: dateStr,
      time: booking.start_time,
      booking_id: bookingId,
      mode: booking.mode,
      video_room_url: booking.video_room_url ?? "",
    };
    const custom = await this.getCustomTemplate(booking.doctor_id, "reminder");
    let html: string;
    let subject: string;
    if (custom?.body_markdown) {
      html = this.renderTemplate(custom.body_markdown, vars);
      subject = custom.subject
        ? this.renderTemplate(custom.subject, vars)
        : "Reminder: Consultation Tomorrow";
    } else {
      html = await render(
        ReminderEmail({
          patientName,
          date: dateStr,
          time: booking.start_time,
          mode: booking.mode,
          bookingId,
          videoRoomUrl: booking.video_room_url ?? undefined,
        })
      );
      subject = "Reminder: Consultation Tomorrow";
    }

    await this.gmailService.sendMessage(booking.doctor_id, {
      to: patientEmail,
      subject,
      htmlBody: html,
    });
    return { message: "Reminder sent", to: patientEmail, bookingId };
  }

  async sendPinMessage(doctorId: string, patientEmail: string, patientName: string, pin: string) {
    const html = await render(PinMessageEmail({ patientName, pin }));

    await this.gmailService.sendMessage(doctorId, {
      to: patientEmail,
      subject: "Your Document Access PIN",
      htmlBody: html,
    });

    return { message: "PIN sent", to: patientEmail };
  }

  async sendIntakeEmail(bookingId: string, patientEmail: string, patientName: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .selectAll("booking")
      .select(["slot.date", "slot.start_time"])
      .where("booking.id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    const dateStr =
      booking.date instanceof Date
        ? booking.date.toLocaleDateString()
        : new Date(booking.date).toLocaleDateString();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const intakeUrl = `${appUrl}/intake/${bookingId}`;

    const vars = {
      patient_name: patientName,
      booking_id: bookingId,
      intake_url: intakeUrl,
      date: dateStr,
      time: booking.start_time,
    };
    const custom = await this.getCustomTemplate(booking.doctor_id, "intake");
    let html: string;
    let subject: string;
    if (custom?.body_markdown) {
      html = this.renderTemplate(custom.body_markdown, vars);
      subject = custom.subject
        ? this.renderTemplate(custom.subject, vars)
        : "Please Complete Your Pre-Consultation Questionnaire";
    } else {
      html = await render(
        PreConsultIntakeEmail({
          patientName,
          bookingId,
          intakeUrl,
          date: dateStr,
          time: booking.start_time,
        })
      );
      subject = "Please Complete Your Pre-Consultation Questionnaire";
    }

    await this.gmailService.sendMessage(booking.doctor_id, {
      to: patientEmail,
      subject,
      htmlBody: html,
    });

    return { message: "Intake email sent", to: patientEmail, bookingId };
  }

  async sendCancellationNotification(
    bookingId: string,
    patientEmail: string,
    patientName: string,
    cancelledBy: "patient" | "doctor",
    doctorName?: string
  ) {
    const booking = await this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .selectAll("booking")
      .select(["slot.date", "slot.start_time"])
      .where("booking.id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    const dateStr =
      booking.date instanceof Date
        ? booking.date.toLocaleDateString()
        : new Date(booking.date).toLocaleDateString();

    const vars = {
      patient_name: patientName,
      date: dateStr,
      time: booking.start_time,
      booking_id: bookingId,
      cancelled_by: cancelledBy,
      clinic_name: doctorName ?? "",
    };
    const custom = await this.getCustomTemplate(booking.doctor_id, "cancellation");
    let html: string;
    let subject: string;
    if (custom?.body_markdown) {
      html = this.renderTemplate(custom.body_markdown, vars);
      subject = custom.subject
        ? this.renderTemplate(custom.subject, vars)
        : "Appointment Cancelled";
    } else {
      html = await render(
        CancellationNotificationEmail({
          patientName,
          date: dateStr,
          time: booking.start_time,
          bookingId,
          cancelledBy,
          doctorName,
        })
      );
      subject =
        cancelledBy === "doctor" ? "Your Appointment Has Been Cancelled" : "Cancellation Confirmed";
    }

    await this.gmailService.sendMessage(booking.doctor_id, {
      to: patientEmail,
      subject: cancelledBy === "doctor" ? "Booking Cancelled by Doctor" : "Booking Cancelled",
      htmlBody: html,
    });

    return { message: "Cancellation notification sent", to: patientEmail, bookingId };
  }

  async sendPostConsultSummary(
    bookingId: string,
    patientEmail: string,
    patientName: string,
    doctorName: string,
    summary?: string,
    hasPrescription?: boolean
  ) {
    const booking = await this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .selectAll("booking")
      .select(["slot.date", "slot.start_time"])
      .where("booking.id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");

    const dateStr =
      booking.date instanceof Date
        ? booking.date.toLocaleDateString()
        : new Date(booking.date).toLocaleDateString();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const followUpUrl = `${appUrl}/book?doctor=${encodeURIComponent(doctorName)}`;

    const html = await render(
      PostConsultSummaryEmail({
        patientName,
        date: dateStr,
        summary,
        hasPrescription: hasPrescription ?? false,
        bookingId,
        followUpUrl,
      })
    );

    await this.gmailService.sendMessage(booking.doctor_id, {
      to: patientEmail,
      subject: "Your Consultation Summary",
      htmlBody: html,
    });

    return { message: "Summary sent", to: patientEmail, bookingId };
  }

  async sendPrescriptionDelivery(
    doctorId: string,
    patientEmail: string,
    patientName: string,
    medicationName: string,
    dosage: string,
    instructions?: string,
    validUntil?: string,
    pdfAttachment?: { filename: string; content: string }
  ) {
    const html = await render(
      PrescriptionDeliveryEmail({
        patientName,
        medicationName,
        dosage,
        instructions,
        validUntil,
        bookingId: "",
      })
    );

    await this.gmailService.sendMessage(doctorId, {
      to: patientEmail,
      subject: "Your Prescription is Ready",
      htmlBody: html,
      attachments: pdfAttachment ? [pdfAttachment] : undefined,
    });

    return { message: "Prescription email sent", to: patientEmail };
  }

  async sendNewBookingAlert(bookingId: string, doctorId: string, patientName: string) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select(["email", "name", "notification_prefs"])
      .where("id", "=", doctorId)
      .executeTakeFirst();

    if (!doctor) return { message: "Doctor not found" };

    const prefs = doctor.notification_prefs as { newBookingAlert?: boolean } | null;
    if (prefs?.newBookingAlert === false) return { message: "Alert disabled by doctor" };

    const booking = await this.database.db
      .selectFrom("booking")
      .innerJoin("slot", "slot.id", "booking.slot_id")
      .select(["slot.date", "slot.start_time"])
      .where("booking.id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) return { message: "Booking not found" };

    const dateStr =
      booking.date instanceof Date
        ? booking.date.toLocaleDateString()
        : new Date(booking.date).toLocaleDateString();

    const body = [
      `Dear Dr. ${doctor.name},`,
      ``,
      `${patientName} has booked a consultation on ${dateStr} at ${booking.start_time}.`,
      ``,
      `Please review and approve or decline the booking in your dashboard.`,
      ``,
      `Reference: ${bookingId}`,
    ].join("\n");

    return this.send({ doctorId, to: doctor.email, subject: "New Booking Pending Review", body });
  }
}
