import "dotenv/config";
import * as Sentry from "@sentry/node";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import express from "express";

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
    snapshot: true,
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

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required — set it before starting");
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required — set it before starting");
  }

  app.use(express.json({ limit: "1mb" }));

  const port = process.env.API_PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
