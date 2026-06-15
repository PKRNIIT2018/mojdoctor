import { Module } from "@nestjs/common";
import { BookingController } from "./booking.controller";
import { BookingService } from "./booking.service";
import { StateMachineService } from "./state-machine.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { GoogleModule } from "../google/google.module";

@Module({
  imports: [NotificationsModule, GoogleModule],
  controllers: [BookingController],
  providers: [BookingService, StateMachineService],
  exports: [BookingService, StateMachineService],
})
export class BookingModule {}
