import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    maxWorkers: 2,
    testTimeout: 10000,
    include: ["tests/**/*.test.ts"],
    exclude: ["worker-tests/**/*.test.ts"],
  },
});
