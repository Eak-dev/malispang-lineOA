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
          TEST_OWNER_ALLOWLIST: "OWNER_TEST_ONLY",
          TEST_REWARD_CARD_URL: "https://u.lin.ee/test-reward-card",
          PUBLIC_ASSET_BASE_URL:
            "https://malispang-lineoa-test.eakkachai-dev.workers.dev",
        },
      },
    }),
  ],
  test: {
    include: ["worker-tests/**/*.test.ts"],
  },
});
