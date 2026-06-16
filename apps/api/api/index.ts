import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ ok: true, env: { db: !!process.env.DATABASE_URL } }));
}
