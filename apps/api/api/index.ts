import type { IncomingMessage, ServerResponse } from "http";

// ponytail: eval keeps the dist/main.js load opaque to esbuild/nft.
// dist/main.js is a self-contained webpack bundle (no external node_modules needed).
// eslint-disable-next-line no-eval, @typescript-eslint/no-implied-eval
const __req = eval("require") as (id: string) => any;

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
let cachedServer: Handler | null = null;
let initError: Error | null = null;

async function bootstrap(): Promise<Handler> {
  if (cachedServer) return cachedServer;
  if (initError) throw initError;
  try {
    const path = __req("path") as typeof import("path");
    // __dirname = /var/task/apps/api/api → ../dist/main = webpack bundle
    const distMain = path.resolve(__dirname, "..", "dist", "serverless");
    const { createServer } = __req(distMain) as { createServer: () => Promise<Handler> };
    cachedServer = await createServer();
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
