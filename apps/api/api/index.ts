import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    require("reflect-metadata");
    const { NestFactory } = require("@nestjs/core");
    const { ExpressAdapter } = require("@nestjs/platform-express");
    const express = require("express");
    const path = require("path");

    const distDir = path.join(__dirname, "..", "dist");
    const { AppModule } = require(path.join(distDir, "app.module"));

    const app = await NestFactory.create(AppModule, new ExpressAdapter(express()), {
      logger: ["error", "warn"],
      snapshot: true,
    });
    await app.init();

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: err.message,
        name: err.constructor?.name,
        stack: err.stack?.split("\n").slice(0, 10),
      })
    );
  }
}
