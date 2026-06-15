import { Module } from "@nestjs/common";
import { IntakeController } from "./intake.controller";
import { IntakeService } from "./intake.service";
import { DoctorModule } from "../doctor/doctor.module";

@Module({
  imports: [DoctorModule],
  controllers: [IntakeController],
  providers: [IntakeService],
  exports: [IntakeService],
})
export class IntakeModule {}
