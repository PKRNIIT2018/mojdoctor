import { Module } from "@nestjs/common";
import { NotesController } from "./notes.controller";
import { NotesService } from "./notes.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { DoctorModule } from "../doctor/doctor.module";

@Module({
  imports: [NotificationsModule, DoctorModule],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
