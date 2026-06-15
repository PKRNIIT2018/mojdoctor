import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/auth.decorator";
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
import type { User } from "@supabase/supabase-js";

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
  async findAll() {
    return this.doctorService.findAll();
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return this.doctorService.getProfile(user.email!);
  }

  @Put("me")
  @UseGuards(AuthGuard)
  async updateProfile(@CurrentUser() user: User, @Body() body: UpdateProfileDto) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.doctorService.updateProfile(doctor!.id, body);
  }

  @Get("me/practice-settings")
  @UseGuards(AuthGuard)
  async getPracticeSettings(@CurrentUser() user: User) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.doctorService.getPracticeSettings(doctor!.id);
  }

  @Put("me/practice-settings")
  @UseGuards(AuthGuard)
  async updatePracticeSettings(@CurrentUser() user: User, @Body() body: UpdatePracticeSettingsDto) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.doctorService.updatePracticeSettings(doctor!.id, body);
  }

  @Get("me/integrations")
  @UseGuards(AuthGuard)
  async getIntegrationSettings(@CurrentUser() user: User) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.doctorService.getIntegrationSettings(doctor!.id);
  }

  @Put("me/integrations")
  @UseGuards(AuthGuard)
  async updateIntegrationSettings(
    @CurrentUser() user: User,
    @Body() body: UpdateIntegrationSettingsDto
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.doctorService.updateIntegrationSettings(doctor!.id, body);
  }

  @Get("me/notifications")
  @UseGuards(AuthGuard)
  async getNotificationPrefs(@CurrentUser() user: User) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.doctorService.getNotificationPrefs(doctor!.id);
  }

  @Put("me/notifications")
  @UseGuards(AuthGuard)
  async updateNotificationPrefs(
    @CurrentUser() user: User,
    @Body() body: UpdateNotificationPrefsDto
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.doctorService.updateNotificationPrefs(doctor!.id, body);
  }

  @Post("me/dpa")
  @UseGuards(AuthGuard)
  async acceptDpa(@CurrentUser() user: User, @Body() body: AcceptDpaDto) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.doctorService.acceptDpa(doctor!.id, body.version);
  }

  @Post("me/stripe-connect")
  @UseGuards(AuthGuard)
  async createStripeConnect(@CurrentUser() user: User) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.stripeConnectService.createAccount(doctor!.id);
  }

  @Post("me/stripe-connect/link")
  @UseGuards(AuthGuard)
  async createStripeConnectLink(@CurrentUser() user: User) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.stripeConnectService.createAccountLink(doctor!.id);
  }

  @Get("me/stripe-connect/status")
  @UseGuards(AuthGuard)
  async getStripeConnectStatus(@CurrentUser() user: User) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.stripeConnectService.getStatus(doctor!.id);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  async create(@Body() body: CreateDoctorDto) {
    return this.doctorService.create(body);
  }
}
