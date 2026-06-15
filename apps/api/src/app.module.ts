import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "./database/database.module";
import { DoctorModule } from "./doctor/doctor.module";
import { SlotModule } from "./slot/slot.module";
import { BookingModule } from "./booking/booking.module";
import { PaymentModule } from "./payment/payment.module";
import { CaseFileModule } from "./case-file/case-file.module";
import { NotesModule } from "./notes/notes.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { GoogleModule } from "./google/google.module";
import { IntakeModule } from "./intake/intake.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { VideoModule } from "./video/video.module";
import { ThrottlerAppModule } from "./throttler/throttler.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000,
        limit: 10,
      },
      {
        name: "medium",
        ttl: 10000,
        limit: 50,
      },
      {
        name: "long",
        ttl: 60000,
        limit: 100,
      },
    ]),
    ThrottlerAppModule,
    DatabaseModule,
    DoctorModule,
    SlotModule,
    BookingModule,
    PaymentModule,
    CaseFileModule,
    NotesModule,
    NotificationsModule,
    FeedbackModule,
    GoogleModule,
    IntakeModule,
    ComplianceModule,
    VideoModule,
    AdminModule,
  ],
})
export class AppModule {}
