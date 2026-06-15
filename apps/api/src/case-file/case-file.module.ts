import { Module } from "@nestjs/common";
import { CaseFileController } from "./case-file.controller";
import { CaseFileService } from "./case-file.service";
import { DoctorModule } from "../doctor/doctor.module";

@Module({
  imports: [DoctorModule],
  controllers: [CaseFileController],
  providers: [CaseFileService],
  exports: [CaseFileService],
})
export class CaseFileModule {}
