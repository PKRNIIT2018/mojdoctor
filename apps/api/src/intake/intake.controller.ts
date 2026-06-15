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
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { IntakeService } from "./intake.service";
import { DoctorService } from "../doctor/doctor.service";
import {
  CreateIntakeTemplateDto,
  UpdateIntakeTemplateDto,
  SubmitIntakeResponseDto,
} from "./dto/intake.dto";
import type { User } from "@supabase/supabase-js";

@Controller("api/intake")
export class IntakeController {
  constructor(
    @Inject(IntakeService) private readonly intakeService: IntakeService,
    @Inject(DoctorService) private readonly doctorService: DoctorService
  ) {}

  @Get("templates/active/:doctorId")
  async getActiveTemplates(@Param("doctorId", ParseUUIDPipe) doctorId: string) {
    return this.intakeService.getActiveTemplates(doctorId);
  }

  @Get("templates")
  @UseGuards(AuthGuard)
  async getTemplates(@CurrentUser() user: User) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.intakeService.getTemplates(doctor!.id);
  }

  @Get("templates/:id")
  @UseGuards(AuthGuard)
  async getTemplate(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.intakeService.getTemplate(id, doctor!.id);
  }

  @Post("templates")
  @UseGuards(AuthGuard)
  async createTemplate(@CurrentUser() user: User, @Body() body: CreateIntakeTemplateDto) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.intakeService.createTemplate({ doctorId: doctor!.id, ...body });
  }

  @Put("templates/:id")
  @UseGuards(AuthGuard)
  async updateTemplate(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateIntakeTemplateDto
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.intakeService.updateTemplate(id, doctor!.id, body);
  }

  @Delete("templates/:id")
  @UseGuards(AuthGuard)
  async deleteTemplate(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.intakeService.deleteTemplate(id, doctor!.id);
  }

  @Post("responses")
  @Throttle({ default: { limit: 20, ttl: 60 * 60 * 1000 } })
  async submitResponse(@Body() body: SubmitIntakeResponseDto) {
    return this.intakeService.submitResponse(body);
  }

  @Get("responses/booking/:bookingId")
  @UseGuards(AuthGuard)
  async getResponses(
    @CurrentUser() user: User,
    @Param("bookingId", ParseUUIDPipe) bookingId: string
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.intakeService.getResponses(bookingId, doctor!.id);
  }

  @Get("responses/:id")
  @UseGuards(AuthGuard)
  async getResponse(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.intakeService.getResponse(id, doctor!.id);
  }
}
