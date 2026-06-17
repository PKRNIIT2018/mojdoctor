import type { IncomingMessage, ServerResponse } from "http";

// Capture the CJS module-scoped require via eval so that:
// 1. esbuild cannot statically follow the call (eval is opaque to the bundler)
// 2. The function runs in MODULE scope (not global scope), so `require` IS defined
// new Function() was the previous approach but fails on Vercel because
// new Function runs in GLOBAL scope where `require` is not set.
// Node 22.12+ / 24 supports require(esm) natively so ESM packages (kysely) load fine.
//
// eslint-disable-next-line no-eval, @typescript-eslint/no-implied-eval
const __req = eval("require") as (id: string) => any;

let cachedServer: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
let initError: Error | null = null;

async function bootstrap(): Promise<(req: IncomingMessage, res: ServerResponse) => void> {
  if (cachedServer) return cachedServer;
  if (initError) throw initError;

  try {
    const path = __req("path") as typeof import("path");
    // process.cwd() = repo root on Vercel (/var/task), not apps/api.
    // __dirname = /var/task/apps/api/api → ../dist = /var/task/apps/api/dist
    const distDir = path.resolve(__dirname, "..", "dist");

    const { AppModule } = __req(path.join(distDir, "app.module")) as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      AppModule: any;
    };
    const { NestFactory } = __req("@nestjs/core") as typeof import("@nestjs/core");
    const { ExpressAdapter } = __req(
      "@nestjs/platform-express"
    ) as typeof import("@nestjs/platform-express");
    const { ValidationPipe } = __req("@nestjs/common") as typeof import("@nestjs/common");
    const express = __req("express") as typeof import("express");

    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);

    const app = await NestFactory.create(AppModule, adapter, {
      logger: ["error", "warn"],
    });

    app.enableCors({
      origin: process.env.FRONTEND_URL ?? "*",
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await app.init();
    cachedServer = expressApp as unknown as (req: IncomingMessage, res: ServerResponse) => void;
    return cachedServer;
  } catch (err) {
    initError = err as Error;
    console.error("[vercel-handler] init failed:", err);
    throw err;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const server = await bootstrap();
    server(req, res);
  } catch (err) {
    console.error("[vercel-handler] request failed:", err);
    const r = res as ServerResponse & { statusCode: number };
    r.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        statusCode: 500,
        message: "Server initialization failed",
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
    );
  }
}
