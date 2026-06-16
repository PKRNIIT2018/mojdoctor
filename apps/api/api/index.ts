import "reflect-metadata";
import express from "express";
import type { IncomingMessage, ServerResponse } from "http";

const expressApp = express();

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    const path = require("path");
    const fs = require("fs");
    const dir = path.join(__dirname || process.cwd(), "..", "dist");
    const exists = fs.existsSync(dir);
    const files = exists ? fs.readdirSync(dir).slice(0, 30) : [];
    const cwdFiles = fs.readdirSync(process.cwd()).slice(0, 30);
    const parentFiles = fs.readdirSync(path.join(process.cwd(), "..")).slice(0, 30);

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        cwd: process.cwd(),
        dirname: __dirname,
        distExists: exists,
        distFiles: files,
        cwdFiles,
        parentFiles,
      })
    );
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: err.message, stack: err.stack?.split("\n").slice(0, 8) }));
  }
}
