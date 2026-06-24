import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { StripeConnectService } from "./stripe-connect.service";
import { CaseFileModule } from "../case-file/case-file.module";
import { BookingModule } from "../booking/booking.module";

@Module({
  imports: [BookingModule, CaseFileModule],
  controllers: [PaymentController],
  providers: [PaymentService, StripeConnectService],
  exports: [PaymentService, StripeConnectService],
})
export class PaymentModule {}
