import "reflect-metadata";
import express from "express";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import type { IncomingMessage, ServerResponse } from "http";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let cachedServer: Handler | null = null;

export async function createServer(): Promise<Handler> {
  if (cachedServer) return cachedServer;
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ["error", "warn"],
    snapshot: false,
  });
  app.enableCors({ origin: process.env.FRONTEND_URL ?? "*", credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
  );
  await app.init();
  cachedServer = expressApp as unknown as Handler;
  return cachedServer;
}
