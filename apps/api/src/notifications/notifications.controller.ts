import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  ParseUUIDPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { NotificationsService } from "./notifications.service";
import { DoctorService } from "../doctor/doctor.service";
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  SendNotificationDto,
  SendPatientNotificationDto,
} from "./dto/notifications.dto";
import type { User } from "@supabase/supabase-js";

@Controller("api/notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
    @Inject(DoctorService) private readonly doctorService: DoctorService
  ) {}

  @Get("templates")
  async getTemplates(@CurrentUser() user: User) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notificationsService.getTemplates(doctor!.id);
  }

  @Get("templates/:id")
  async getTemplate(@Param("id", ParseUUIDPipe) id: string) {
    return this.notificationsService.getTemplate(id);
  }

  @Post("templates")
  async createTemplate(@CurrentUser() user: User, @Body() body: CreateTemplateDto) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notificationsService.createTemplate({ doctorId: doctor!.id, ...body });
  }

  @Put("templates/:id")
  async updateTemplate(@Param("id", ParseUUIDPipe) id: string, @Body() body: UpdateTemplateDto) {
    return this.notificationsService.updateTemplate(id, body);
  }

  @Delete("templates/:id")
  async deleteTemplate(@Param("id", ParseUUIDPipe) id: string) {
    return this.notificationsService.deleteTemplate(id);
  }

  @Post("send")
  async send(@CurrentUser() user: User, @Body() body: SendNotificationDto) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notificationsService.send({ doctorId: doctor!.id, ...body });
  }

  @Post("send-confirmation/:bookingId")
  async sendConfirmation(
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() body: SendPatientNotificationDto
  ) {
    return this.notificationsService.sendBookingConfirmation(
      bookingId,
      body.patientEmail,
      body.patientName
    );
  }

  @Post("send-reminder/:bookingId")
  async sendReminder(
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @Body() body: SendPatientNotificationDto
  ) {
    return this.notificationsService.sendReminder(bookingId, body.patientEmail, body.patientName);
  }
}
