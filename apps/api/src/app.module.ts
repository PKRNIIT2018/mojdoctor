import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import * as Joi from "joi";
import { AuthModule } from "./auth/auth.module";
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
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
        NEXT_PUBLIC_SUPABASE_URL: Joi.string().required(),
        STRIPE_SECRET_KEY: Joi.string().required(),
        STRIPE_WEBHOOK_SECRET: Joi.string().required(),
        SENTRY_DSN: Joi.string().optional().allow(""),
        FRONTEND_URL: Joi.string().uri().optional(),
        PORT: Joi.number().port().optional(),
        API_PORT: Joi.number().port().optional(),
        SUPER_ADMIN_EMAIL: Joi.string().email().optional(),
        NODE_ENV: Joi.string().valid("development", "production", "test").optional(),
      }),
    }),
    AuthModule,
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
