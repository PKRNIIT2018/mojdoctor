import "reflect-metadata";
import * as Sentry from "@sentry/node";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "../dist/app.module";
import { AllExceptionsFilter } from "../dist/utils/error-filter";
import express from "express";
import type { IncomingMessage, ServerResponse } from "http";

// Reuse the Express app across Lambda invocations (warm start)
const expressApp = express();
let initialized = false;

async function bootstrap() {
  if (initialized) return;

  const logger = new Logger("Bootstrap");

  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ["log", "error", "warn"],
    snapshot: true,
  });

  app.use(helmet());
  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "*",
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

  await app.init();
  initialized = true;
}

const handlerLogger = new Logger("Handler");

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await bootstrap();
    expressApp(req as any, res as any);
  } catch (err: any) {
    handlerLogger.error(`FUNCTION_ERROR: ${err?.message ?? err}`, err?.stack);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Internal Server Error", message: err?.message ?? "Unknown" }));
  }
}
