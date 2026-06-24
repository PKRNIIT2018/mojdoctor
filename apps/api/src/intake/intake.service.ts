import { Injectable, NotFoundException, Inject, ForbiddenException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { assertOwnership } from "../common/guards/ownership.helper";

@Injectable()
export class IntakeService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async getTemplates(doctorId: string) {
    return this.database.db
      .selectFrom("pre_consult_template")
      .selectAll()
      .where("doctor_id", "=", doctorId)
      .orderBy("title", "asc")
      .execute();
  }

  async getActiveTemplates(doctorId: string) {
    return this.database.db
      .selectFrom("pre_consult_template")
      .selectAll()
      .where("doctor_id", "=", doctorId)
      .where("is_active", "=", true)
      .orderBy("title", "asc")
      .execute();
  }

  async getTemplate(id: string, doctorId?: string) {
    const template = await this.database.db
      .selectFrom("pre_consult_template")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!template) throw new NotFoundException("Template not found");
    if (doctorId && template.doctor_id !== doctorId) throw new ForbiddenException();
    return template;
  }

  async createTemplate(data: {
    doctorId: string;
    title: string;
    description?: string;
    questions: { label: string; type: string; required: boolean }[];
    isActive?: boolean;
  }) {
    return this.database.db
      .insertInto("pre_consult_template")
      .values({
        doctor_id: data.doctorId,
        title: data.title,
        description: data.description ?? null,
        questions: JSON.stringify(data.questions),
        is_active: data.isActive ?? true,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateTemplate(
    id: string,
    doctorId: string,
    data: {
      title?: string;
      description?: string;
      questions?: { label: string; type: string; required: boolean }[];
      isActive?: boolean;
    }
  ) {
    await this.getTemplate(id, doctorId);
    return this.database.db
      .updateTable("pre_consult_template")
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.questions !== undefined && { questions: JSON.stringify(data.questions) }),
        ...(data.isActive !== undefined && { is_active: data.isActive }),
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async deleteTemplate(id: string, doctorId: string) {
    await this.getTemplate(id, doctorId);
    await this.database.db.deleteFrom("pre_consult_template").where("id", "=", id).execute();
    return { message: "Template deleted" };
  }

  async submitResponse(data: { bookingId: string; responses: Record<string, unknown> }) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", data.bookingId)
      .executeTakeFirst();
    if (!booking) throw new NotFoundException("Booking not found");

    return this.database.db
      .insertInto("intake_response")
      .values({
        booking_id: data.bookingId,
        responses: JSON.stringify(data.responses),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async getResponses(bookingId: string, doctorId: string) {
    await assertOwnership(this.database, "booking", bookingId, doctorId);
    return this.database.db
      .selectFrom("intake_response")
      .selectAll()
      .where("booking_id", "=", bookingId)
      .orderBy("submitted_at", "desc")
      .execute();
  }

  async getResponse(id: string, doctorId: string) {
    const response = await this.database.db
      .selectFrom("intake_response")
      .innerJoin("booking", "booking.id", "intake_response.booking_id")
      .selectAll("intake_response")
      .select("booking.doctor_id")
      .where("intake_response.id", "=", id)
      .executeTakeFirst();
    if (!response) throw new NotFoundException("Intake response not found");
    if (response.doctor_id !== doctorId) throw new ForbiddenException();
    return response;
  }
}
