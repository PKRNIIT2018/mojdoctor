import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Inject,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentDoctor } from "../auth/doctor.decorator";
import { ResolveDoctorInterceptor } from "../auth/resolve-doctor.interceptor";
import { ComplianceService } from "./compliance.service";
import { AnonymizeDto, ExportDataDto, ErasureDto } from "./dto/compliance.dto";

@Controller("api/compliance")
@UseGuards(AuthGuard)
@UseInterceptors(ResolveDoctorInterceptor)
export class ComplianceController {
  constructor(@Inject(ComplianceService) private readonly complianceService: ComplianceService) {}

  @Get("stats")
  async getStats(@CurrentDoctor() doctor: { id: string }) {
    return this.complianceService.getStats(doctor.id);
  }

  @Post("anonymize")
  async anonymize(@CurrentDoctor() doctor: { id: string }, @Body() body: AnonymizeDto) {
    return this.complianceService.anonymizePatientData(doctor.id, body.olderThanDays ?? 365);
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
