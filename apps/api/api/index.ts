import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  try {
    const fs = require("fs");
    const path = require("path");

    // Check if @repo/db's compiled dist exists
    const dbPkgPath = path.join(process.cwd(), "node_modules", "@repo", "db", "package.json");
    const pkg = JSON.parse(fs.readFileSync(dbPkgPath, "utf-8"));

    const distMain = path.join(process.cwd(), "node_modules", "@repo", "db", pkg.main);
    const distExists = fs.existsSync(distMain);

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        cwd: process.cwd(),
        main: pkg.main,
        distMain,
        distExists,
        files: fs.readdirSync(path.dirname(distMain)).slice(0, 20),
      })
    );
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: err.message,
        code: err.code,
        stack: err.stack?.split("\n").slice(0, 8),
      })
    );
  }
}
