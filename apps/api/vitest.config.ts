import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@repo/db": path.resolve(__dirname, "../../packages/db/src"),
      "@repo/email": path.resolve(__dirname, "../../packages/email/src"),
      "@repo/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@repo/video": path.resolve(__dirname, "../../packages/video/src"),
    },
  },
});
