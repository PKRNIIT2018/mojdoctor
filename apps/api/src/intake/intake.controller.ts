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
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentDoctor } from "../auth/doctor.decorator";
import { ResolveDoctorInterceptor } from "../auth/resolve-doctor.interceptor";
import { IntakeService } from "./intake.service";
import {
  CreateIntakeTemplateDto,
  UpdateIntakeTemplateDto,
  SubmitIntakeResponseDto,
} from "./dto/intake.dto";

@Controller("api/intake")
export class IntakeController {
  constructor(@Inject(IntakeService) private readonly intakeService: IntakeService) {}

  @Get("templates/active/:doctorId")
  async getActiveTemplates(@Param("doctorId", ParseUUIDPipe) doctorId: string) {
    return this.intakeService.getActiveTemplates(doctorId);
  }

  @Get("templates")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async getTemplates(@CurrentDoctor() doctor: { id: string }) {
    return this.intakeService.getTemplates(doctor.id);
  }

  @Get("templates/:id")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async getTemplate(
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.intakeService.getTemplate(id, doctor.id);
  }

  @Post("templates")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async createTemplate(
    @CurrentDoctor() doctor: { id: string },
    @Body() body: CreateIntakeTemplateDto
  ) {
    return this.intakeService.createTemplate({ doctorId: doctor.id, ...body });
  }

  @Put("templates/:id")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async updateTemplate(
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateIntakeTemplateDto
  ) {
    return this.intakeService.updateTemplate(id, doctor.id, body);
  }

  @Delete("templates/:id")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async deleteTemplate(
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.intakeService.deleteTemplate(id, doctor.id);
  }

  @Post("responses")
  @Throttle({ default: { limit: 20, ttl: 60 * 60 * 1000 } })
  async submitResponse(@Body() body: SubmitIntakeResponseDto) {
    return this.intakeService.submitResponse(body);
  }

  @Get("responses/booking/:bookingId")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async getResponses(
    @CurrentDoctor() doctor: { id: string },
    @Param("bookingId", ParseUUIDPipe) bookingId: string
  ) {
    return this.intakeService.getResponses(bookingId, doctor.id);
  }

  @Get("responses/:id")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async getResponse(
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.intakeService.getResponse(id, doctor.id);
  }
}
