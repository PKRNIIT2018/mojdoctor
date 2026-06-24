import "dotenv/config";
import * as Sentry from "@sentry/node";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./utils/error-filter";
import express from "express";

const logger = new Logger("Bootstrap");

async function bootstrap() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }

  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn"],
    snapshot: process.env.NODE_ENV !== "production",
  });

  app.use(helmet());
  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    })
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.warn("STRIPE_WEBHOOK_SECRET missing — webhook endpoints will fail");
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    logger.warn("STRIPE_SECRET_KEY missing — payment endpoints will fail");
  }

  app.use(express.json({ limit: "1mb" }));

  const port = process.env.PORT ?? process.env.API_PORT ?? 4000;
  await app.listen(port);
  logger.log(`API running on port ${port}`);
}
bootstrap();
