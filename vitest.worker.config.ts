import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const fixtureValue = (name: string): string => `unit-test-${name}`;

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          LINE_CHANNEL_SECRET: fixtureValue("signature-key"),
          LINE_CHANNEL_ACCESS_TOKEN: fixtureValue("access-key"),
          LINE_BOT_USER_ID: "U_TEST_ONLY_DESTINATION",
          TEST_ADMIN_KEY: fixtureValue("admin-key"),
        },
      },
    }),
  ],
  test: {
    include: ["worker-tests/**/*.test.ts"],
  },
});
