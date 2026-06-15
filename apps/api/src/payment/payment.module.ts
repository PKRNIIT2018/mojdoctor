import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { StripeConnectService } from "./stripe-connect.service";

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, StripeConnectService],
  exports: [PaymentService, StripeConnectService],
})
export class PaymentModule {}
