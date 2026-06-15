import { Controller, Get, Post, Body, Param, Query, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { ComplianceService } from "./compliance.service";
import { DoctorService } from "../doctor/doctor.service";
import { AnonymizeDto, ExportDataDto, ErasureDto } from "./dto/compliance.dto";
import type { User } from "@supabase/supabase-js";

@Controller("api/compliance")
@UseGuards(AuthGuard)
export class ComplianceController {
  constructor(
    @Inject(ComplianceService) private readonly complianceService: ComplianceService,
    @Inject(DoctorService) private readonly doctorService: DoctorService
  ) {}

  @Get("stats")
  async getStats(@CurrentUser() user: User) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.complianceService.getStats(doctor!.id);
  }

  @Post("anonymize")
  async anonymize(@CurrentUser() user: User, @Body() body: AnonymizeDto) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.complianceService.anonymizePatientData(doctor!.id, body.olderThanDays ?? 365);
  }

  @Post("export")
  async exportData(@Body() body: ExportDataDto) {
    return this.complianceService.exportPatientData(body.email);
  }

  @Post("erasure")
  async deleteData(@Body() body: ErasureDto) {
    return this.complianceService.deletePatientData(body.email);
  }
}
