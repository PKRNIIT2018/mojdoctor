import type { IncomingMessage, ServerResponse } from "http";

// All requires go through a runtime-only wrapper so esbuild cannot statically
// follow any of them and bundle them at build time.  esbuild cannot analyse
// eval(), so __req below is effectively invisible to the bundler and all
// resolution happens via Node's native require at Lambda startup time.
// Node 22.12+ / 24 supports require(esm) natively, so ESM packages such as
// kysely load without issues.
//
// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
const __req: (id: string) => any = new Function("id", "return require(id)");

let cachedServer: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
let initError: Error | null = null;

async function bootstrap(): Promise<(req: IncomingMessage, res: ServerResponse) => void> {
  if (cachedServer) return cachedServer;
  if (initError) throw initError;

  try {
    const path = __req("path") as typeof import("path");
    const distDir = path.resolve(process.cwd(), "dist");

    const { AppModule } = __req(path.join(distDir, "app.module")) as {
      AppModule: unknown;
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
