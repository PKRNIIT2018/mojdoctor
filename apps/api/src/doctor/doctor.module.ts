import { Global, Module } from "@nestjs/common";
import { DoctorController } from "./doctor.controller";
import { DoctorService } from "./doctor.service";
import { PaymentModule } from "../payment/payment.module";

@Global()
@Module({
  imports: [PaymentModule],
  controllers: [DoctorController],
  providers: [DoctorService],
  exports: [DoctorService],
})
export class DoctorModule {}
