import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Inject,
  ParseUUIDPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentDoctor } from "../auth/doctor.decorator";
import { ResolveDoctorInterceptor } from "../auth/resolve-doctor.interceptor";
import { NotificationsService } from "./notifications.service";
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  SendNotificationDto,
  SendPatientNotificationDto,
} from "./dto/notifications.dto";

@Controller("api/notifications")
@UseGuards(AuthGuard)
@UseInterceptors(ResolveDoctorInterceptor)
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService
  ) {}

  @Get("templates")
  async getTemplates(@CurrentDoctor() doctor: { id: string }) {
    return this.notificationsService.getTemplates(doctor.id);
  }

  @Get("templates/:id")
  async getTemplate(@Param("id", ParseUUIDPipe) id: string) {
    return this.notificationsService.getTemplate(id);
  }

  @Post("templates")
  async createTemplate(@CurrentDoctor() doctor: { id: string }, @Body() body: CreateTemplateDto) {
    return this.notificationsService.createTemplate({ doctorId: doctor.id, ...body });
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
  async send(@CurrentDoctor() doctor: { id: string }, @Body() body: SendNotificationDto) {
    return this.notificationsService.send({ doctorId: doctor.id, ...body });
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
