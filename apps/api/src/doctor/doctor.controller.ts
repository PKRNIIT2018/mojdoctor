import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  Inject,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentDoctor } from "../auth/doctor.decorator";
import { ResolveDoctorInterceptor } from "../auth/resolve-doctor.interceptor";
import { DoctorService } from "./doctor.service";
import { StripeConnectService } from "../payment/stripe-connect.service";
import {
  CreateDoctorDto,
  UpdateProfileDto,
  UpdatePracticeSettingsDto,
  UpdateIntegrationSettingsDto,
  UpdateNotificationPrefsDto,
  AcceptDpaDto,
} from "./dto/doctor.dto";

@Controller("api/doctors")
export class DoctorController {
  constructor(
    @Inject(DoctorService) private readonly doctorService: DoctorService,
    @Inject(StripeConnectService) private readonly stripeConnectService: StripeConnectService
  ) {}

  @Get("public")
  async findAllPublic() {
    return this.doctorService.findPublic();
  }

  @Get(":id/public")
  async getPublicProfile(@Param("id", ParseUUIDPipe) id: string) {
    return this.doctorService.findOne(id);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.doctorService.findAll(Number(page) || 1, Number(limit) || 50);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async getProfile(@CurrentDoctor() doctor: { id: string }) {
    return this.doctorService.getProfile(doctor.id);
  }

  @Put("me")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async updateProfile(@CurrentDoctor() doctor: { id: string }, @Body() body: UpdateProfileDto) {
    return this.doctorService.updateProfile(doctor.id, body);
  }

  @Get("me/practice-settings")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async getPracticeSettings(@CurrentDoctor() doctor: { id: string }) {
    return this.doctorService.getPracticeSettings(doctor.id);
  }

  @Put("me/practice-settings")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async updatePracticeSettings(
    @CurrentDoctor() doctor: { id: string },
    @Body() body: UpdatePracticeSettingsDto
  ) {
    return this.doctorService.updatePracticeSettings(doctor.id, body);
  }

  @Get("me/integrations")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async getIntegrationSettings(@CurrentDoctor() doctor: { id: string }) {
    return this.doctorService.getIntegrationSettings(doctor.id);
  }

  @Put("me/integrations")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async updateIntegrationSettings(
    @CurrentDoctor() doctor: { id: string },
    @Body() body: UpdateIntegrationSettingsDto
  ) {
    return this.doctorService.updateIntegrationSettings(doctor.id, body);
  }

  @Get("me/notifications")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async getNotificationPrefs(@CurrentDoctor() doctor: { id: string }) {
    return this.doctorService.getNotificationPrefs(doctor.id);
  }

  @Put("me/notifications")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async updateNotificationPrefs(
    @CurrentDoctor() doctor: { id: string },
    @Body() body: UpdateNotificationPrefsDto
  ) {
    return this.doctorService.updateNotificationPrefs(doctor.id, body);
  }

  @Post("me/dpa")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async acceptDpa(@CurrentDoctor() doctor: { id: string }, @Body() body: AcceptDpaDto) {
    return this.doctorService.acceptDpa(doctor.id, body.version);
  }

  @Post("me/stripe-connect")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async createStripeConnect(@CurrentDoctor() doctor: { id: string }) {
    return this.stripeConnectService.createAccount(doctor.id);
  }

  @Post("me/stripe-connect/link")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async createStripeConnectLink(@CurrentDoctor() doctor: { id: string }) {
    return this.stripeConnectService.createAccountLink(doctor.id);
  }

  @Get("me/stripe-connect/status")
  @UseGuards(AuthGuard)
  @UseInterceptors(ResolveDoctorInterceptor)
  async getStripeConnectStatus(@CurrentDoctor() doctor: { id: string }) {
    return this.stripeConnectService.getStatus(doctor.id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async create(@Body() body: CreateDoctorDto) {
    return this.doctorService.create(body);
  }
}
