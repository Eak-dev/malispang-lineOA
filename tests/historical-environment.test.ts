import { describe, expect, it } from "vitest";
import {
  historicalEnvironmentKeys as keys,
  withHistoricalEnvironment,
} from "./helpers/historical-environment.js";

describe("historical test environment isolation", () => {
  it.each(["success", "rejection", "synchronous-throw"])(
    "awaits %s and restores every inherited PR field",
    async (mode) => {
      const previous = keys.map((key) => [key, process.env[key]] as const);
      try {
        keys.forEach((key) => {
          process.env[key] = "synthetic-" + key;
        });
        process.env.GITHUB_EVENT_NAME = "pull_request";
        const inherited = keys.map((key) => process.env[key]);
        const error = new Error("synthetic failure");
        let release!: () => void;
        const barrier = new Promise<void>((resolve) => {
          release = resolve;
        });
        let reached = false;
        const operation = withHistoricalEnvironment(() => {
          expect(process.env.GITHUB_EVENT_NAME).toBe("push");
          for (const key of keys.slice(1))
            expect(process.env[key]).toBeUndefined();
          reached = true;
          if (mode === "synchronous-throw") throw error;
          return barrier.then(() => {
            expect(process.env.GITHUB_EVENT_NAME).toBe("push");
            keys.forEach((key) => {
              process.env[key] = "callback-changed";
            });
            if (mode === "rejection") throw error;
            return "value";
          });
        });
        expect(reached).toBe(true);
        if (mode !== "synchronous-throw")
          expect(process.env.GITHUB_EVENT_NAME).toBe("push");
        release();
        if (mode === "success") await expect(operation).resolves.toBe("value");
        else await expect(operation).rejects.toBe(error);
        expect(keys.map((key) => process.env[key])).toEqual(inherited);
      } finally {
        for (const [key, value] of previous) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    },
  );
  it("restores absent fields and nested scopes without manufacturing event identity", async () => {
    const previous = keys.map((key) => [key, process.env[key]] as const);
    try {
      keys.forEach((key) => {
        delete process.env[key];
      });
      await withHistoricalEnvironment(async () => {
        await withHistoricalEnvironment(async () => {
          await Promise.resolve();
        });
        expect(process.env.GITHUB_EVENT_NAME).toBe("push");
      });
      keys.forEach((key) => {
        expect(Object.hasOwn(process.env, key)).toBe(false);
      });
    } finally {
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
