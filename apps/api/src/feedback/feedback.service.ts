import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class FeedbackService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(data: { bookingId: string; rating?: number; comment?: string }) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", data.bookingId)
      .executeTakeFirst();
    if (!booking) throw new NotFoundException("Booking not found");

    return this.database.db
      .insertInto("feedback")
      .values({
        booking_id: data.bookingId,
        rating: data.rating ?? null,
        comment: data.comment ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async findByBooking(bookingId: string) {
    return this.database.db
      .selectFrom("feedback")
      .selectAll()
      .where("booking_id", "=", bookingId)
      .execute();
  }

  async findByDoctor(doctorId: string) {
    return this.database.db
      .selectFrom("feedback")
      .innerJoin("booking", "booking.id", "feedback.booking_id")
      .selectAll("feedback")
      .select(["booking.patient_name", "booking.patient_email"])
      .where("booking.doctor_id", "=", doctorId)
      .orderBy("feedback.created_at", "desc")
      .execute();
  }

  async getStats(doctorId: string) {
    const result = await this.database.db
      .selectFrom("feedback")
      .innerJoin("booking", "booking.id", "feedback.booking_id")
      .where("booking.doctor_id", "=", doctorId)
      .where("feedback.rating", "is not", null)
      .select((eb) => [
        eb.fn.count<number>("feedback.id").as("total"),
        eb.fn.avg<number>("feedback.rating").as("averageRating"),
        eb.fn.count<number>("feedback.rating").as("ratedCount"),
      ])
      .executeTakeFirst();

    return {
      total: Number(result?.total || 0),
      averageRating: result?.averageRating ? Number(result.averageRating).toFixed(1) : null,
      ratedCount: Number(result?.ratedCount || 0),
    };
  }

  async findOne(id: string) {
    const feedback = await this.database.db
      .selectFrom("feedback")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!feedback) throw new NotFoundException("Feedback not found");
    return feedback;
  }
}
