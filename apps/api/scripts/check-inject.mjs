import { readFileSync, readdirSync } from "fs";
import { join, relative } from "path";
import { fileURLToPath } from "url";

const srcDir = join(fileURLToPath(new URL("..", import.meta.url)), "src");
const failureCount = { value: 0 };

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) checkFile(full);
  }
}

function checkFile(file) {
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("constructor(") || line.startsWith("constructor (")) {
      let braceDepth = 0;
      let startIdx = i;
      let j = i;
      for (; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === "(") braceDepth++;
          if (ch === ")") braceDepth--;
        }
        if (braceDepth === 0) break;
      }
      if (braceDepth !== 0) continue;

      const constructorBody = lines.slice(startIdx, j + 1).join("\n");
      const paramMatch = constructorBody.match(/constructor\s*\(([^)]*)\)/);
      if (!paramMatch) continue;

      const params = paramMatch[1].trim();
      if (!params || params === "void") continue;

      const paramList = splitParams(params);
      const fileRel = relative(srcDir, file);

      for (const param of paramList) {
        const trimmed = param.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("@Inject(")) continue;
        if (trimmed.startsWith("@")) continue;
        if (trimmed.startsWith("...")) continue;
        if (trimmed === "") continue;

        console.error(`MISSING @Inject(): ${fileRel}:${startIdx + 1}  →  ${trimmed}`);
        failureCount.value++;
      }
    }
  }
}

function splitParams(params) {
  const result = [];
  let depth = 0;
  let current = "";
  for (const ch of params) {
    if (ch === "," && depth === 0) {
      result.push(current);
      current = "";
    } else {
      if (ch === "(" || ch === "<") depth++;
      if (ch === ")" || ch === ">") depth--;
      current += ch;
    }
  }
  if (current.trim()) result.push(current);
  return result;
}

walk(srcDir);

if (failureCount.value > 0) {
  console.error(`\nFound ${failureCount.value} constructor parameter(s) missing @Inject()`);
  process.exit(1);
} else {
  console.log("All constructor parameters have @Inject() ✅");
}
