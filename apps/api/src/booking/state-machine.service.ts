import { Injectable, BadRequestException, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { GoogleCalendarService } from "../google/google-calendar.service";

export type AppointmentState =
  | "PENDING_REVIEW"
  | "AWAITING_CARD"
  | "AWAITING_PATIENT_RESCHEDULE"
  | "AWAITING_DOCTOR_REAPPROVAL"
  | "CONFIRMED"
  | "CAPTURED"
  | "COMPLETED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED_BY_PATIENT"
  | "CANCELLED_BY_DOCTOR"
  | "NO_SHOW"
  | "PAYMENT_FAILED";

interface Transition {
  from: AppointmentState[];
  to: AppointmentState;
  label: string;
  terminal?: boolean;
}

@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);
  private transitions: Transition[] = [
    { from: ["PENDING_REVIEW"], to: "AWAITING_CARD", label: "Approve (card)" },
    { from: ["PENDING_REVIEW"], to: "CONFIRMED", label: "Approve (as agreed)" },
    { from: ["PENDING_REVIEW"], to: "REJECTED", label: "Reject" },
    { from: ["PENDING_REVIEW"], to: "EXPIRED", label: "Auto-expire (24h no response)" },

    { from: ["AWAITING_CARD"], to: "CONFIRMED", label: "Card pre-auth succeeded" },
    { from: ["AWAITING_CARD"], to: "EXPIRED", label: "Auto-expire (24h no card)" },
    { from: ["AWAITING_CARD"], to: "CANCELLED_BY_DOCTOR", label: "Doctor cancels" },

    { from: ["CONFIRMED"], to: "AWAITING_PATIENT_RESCHEDULE", label: "Doctor postpones" },
    { from: ["CONFIRMED"], to: "CANCELLED_BY_PATIENT", label: "Patient cancels" },
    { from: ["CONFIRMED"], to: "CANCELLED_BY_DOCTOR", label: "Doctor cancels" },
    { from: ["CONFIRMED"], to: "CAPTURED", label: "Payment captured" },
    { from: ["CONFIRMED"], to: "PAYMENT_FAILED", label: "Capture declined" },

    {
      from: ["AWAITING_PATIENT_RESCHEDULE"],
      to: "AWAITING_DOCTOR_REAPPROVAL",
      label: "Patient picks new slot",
    },
    {
      from: ["AWAITING_PATIENT_RESCHEDULE"],
      to: "CANCELLED_BY_PATIENT",
      label: "Patient gives up",
    },

    { from: ["AWAITING_DOCTOR_REAPPROVAL"], to: "AWAITING_CARD", label: "Doctor re-approves" },
    { from: ["AWAITING_DOCTOR_REAPPROVAL"], to: "REJECTED", label: "Doctor rejects again" },

    { from: ["PAYMENT_FAILED"], to: "CAPTURED", label: "Patient retries successfully" },
    { from: ["PAYMENT_FAILED"], to: "CANCELLED_BY_DOCTOR", label: "Doctor cancels" },

    { from: ["CAPTURED"], to: "COMPLETED", label: "Consult completed" },
    { from: ["CAPTURED"], to: "NO_SHOW", label: "Doctor marks no-show" },
  ];

  private terminalStates: Set<AppointmentState> = new Set([
    "REJECTED",
    "EXPIRED",
    "CANCELLED_BY_PATIENT",
    "CANCELLED_BY_DOCTOR",
    "COMPLETED",
    "NO_SHOW",
  ]);

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(GoogleCalendarService) private readonly googleCalendar: GoogleCalendarService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  private canTransition(from: AppointmentState, to: AppointmentState): boolean {
    return this.transitions.some((t) => t.from.includes(from) && t.to === to);
  }

  private isTerminal(state: AppointmentState): boolean {
    return this.terminalStates.has(state);
  }

  async transitionTo(
    bookingId: string,
    newState: AppointmentState,
    options?: { changes?: Record<string, { from: unknown; to: unknown }>; actor?: string }
  ): Promise<void> {
    const booking = await this.database.db
      .selectFrom("booking")
      .select([
        "id",
        "status",
        "current_state_entered_at",
        "slot_id",
        "doctor_id",
        "calendar_event_id",
        "patient_email",
        "patient_name",
        "video_room_url",
      ])
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) {
      throw new BadRequestException(`Booking ${bookingId} not found`);
    }

    const currentState = booking.status as AppointmentState;

    if (!this.canTransition(currentState, newState)) {
      throw new BadRequestException(`Cannot transition from ${currentState} to ${newState}`);
    }

    if (this.isTerminal(currentState)) {
      throw new BadRequestException(`Booking is already in terminal state ${currentState}`);
    }

    const now = new Date();

    await this.database.db.transaction().execute(async (trx) => {
      await trx
        .updateTable("booking")
        .set({
          status: newState,
          current_state_entered_at: now,
          updated_at: now,
        })
        .where("id", "=", bookingId)
        .execute();

      // If transitioning away from CONFIRMED or AWAITING_CARD, reopen the slot
      if (
        (currentState === "CONFIRMED" || currentState === "AWAITING_CARD") &&
        ["CANCELLED_BY_PATIENT", "CANCELLED_BY_DOCTOR", "REJECTED", "EXPIRED"].includes(newState)
      ) {
        await trx
          .updateTable("slot")
          .set({ status: "open", updated_at: now })
          .where("id", "=", booking.slot_id)
          .execute();
      }

      // If approved, mark slot as booked
      if (newState === "AWAITING_CARD" || newState === "CONFIRMED") {
        await trx
          .updateTable("slot")
          .set({ status: "booked", updated_at: now })
          .where("id", "=", booking.slot_id)
          .execute();
      }

      // If postponed, reopen slot
      if (newState === "AWAITING_PATIENT_RESCHEDULE") {
        await trx
          .updateTable("slot")
          .set({ status: "open", updated_at: now })
          .where("id", "=", booking.slot_id)
          .execute();
      }

      await trx
        .insertInto("audit_log")
        .values({
          entity_type: "booking",
          entity_id: bookingId,
          action: `state_change:${currentState}->${newState}`,
          actor_id: options?.actor ?? "system",
          changes: JSON.stringify(
            options?.changes ?? {
              status: { from: currentState, to: newState },
            }
          ),
        })
        .execute();
    });

    // --- Google Calendar integration (non-critical: errors must not roll back the transition) ---
    await this.handleCalendarEvent(booking, currentState, newState, now).catch((err: unknown) =>
      this.logger.error(`handleCalendarEvent: ${err instanceof Error ? err.message : err}`)
    );
  }

  private async handleCalendarEvent(
    booking: {
      id: string;
      slot_id: string;
      doctor_id: string;
      patient_email: string;
      patient_name: string;
      calendar_event_id: string | null;
      video_room_url: string | null;
    },
    currentState: AppointmentState,
    newState: AppointmentState,
    now: Date
  ): Promise<void> {
    const calendarId = this.configService.get<string>("GOOGLE_CALENDAR_ID") ?? "primary";

    // Delete event when leaving CONFIRMED for cancellation or reschedule
    if (currentState === "CONFIRMED" && booking.calendar_event_id) {
      if (
        ["CANCELLED_BY_PATIENT", "CANCELLED_BY_DOCTOR", "AWAITING_PATIENT_RESCHEDULE"].includes(
          newState
        )
      ) {
        await this.googleCalendar
          .deleteEvent(booking.doctor_id, calendarId, booking.calendar_event_id)
          .catch((err: unknown) =>
            this.logger.error(
              `googleCalendar.deleteEvent: ${err instanceof Error ? err.message : err}`
            )
          );
        await this.database.db
          .updateTable("booking")
          .set({ calendar_event_id: null, updated_at: now })
          .where("id", "=", booking.id)
          .execute();
      }
    }

    // Create event when entering CONFIRMED
    if (newState === "CONFIRMED") {
      const slot = await this.database.db
        .selectFrom("slot")
        .select(["date", "start_time", "end_time"])
        .where("id", "=", booking.slot_id)
        .executeTakeFirst();

      if (slot) {
        const dateStr =
          slot.date instanceof Date
            ? slot.date.toISOString().slice(0, 10)
            : String(slot.date).slice(0, 10);

        const event = await this.googleCalendar
          .createEvent(booking.doctor_id, calendarId, {
            summary: "Medical Consultation",
            description: `Consultation with ${booking.patient_name}`,
            start: { dateTime: `${dateStr}T${slot.start_time}` },
            end: { dateTime: `${dateStr}T${slot.end_time}` },
            attendeeEmails: [booking.patient_email],
            addMeet: true,
          })
          .catch((err: unknown) => {
            this.logger.error(
              `googleCalendar.createEvent: ${err instanceof Error ? err.message : err}`
            );
            return null;
          });

        if (event) {
          const meetUrl = (event as any).hangoutLink ?? (event as any).hangout_link ?? null;
          await this.database.db
            .updateTable("booking")
            .set({
              calendar_event_id: event.id ?? null,
              video_room_url: meetUrl ?? booking.video_room_url,
              updated_at: now,
            })
            .where("id", "=", booking.id)
            .execute();
        }
      }
    }
  }

  async getExpiredBookings(): Promise<{ id: string; status: string; slot_id: string }[]> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pendingExpired = await this.database.db
      .selectFrom("booking")
      .select(["id", "status", "slot_id"])
      .where("status", "=", "PENDING_REVIEW")
      .where("current_state_entered_at", "<", twentyFourHoursAgo)
      .execute();

    const cardExpired = await this.database.db
      .selectFrom("booking")
      .select(["id", "status", "slot_id"])
      .where("status", "=", "AWAITING_CARD")
      .where("current_state_entered_at", "<", twentyFourHoursAgo)
      .execute();

    return [...pendingExpired, ...cardExpired];
  }

  async getPatientRescheduleExpired(): Promise<{ id: string }[]> {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    return this.database.db
      .selectFrom("booking")
      .select(["id"])
      .where("status", "=", "AWAITING_PATIENT_RESCHEDULE")
      .where("current_state_entered_at", "<", fortyEightHoursAgo)
      .execute();
  }
}
