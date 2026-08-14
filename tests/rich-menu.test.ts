import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  validateRichMenuActionMap,
  type RichMenuActionMap,
} from "../src/index.js";

const map = JSON.parse(
  readFileSync(
    "docs/line-oa/production-mirror/test-rich-menu-action-map.json",
    "utf8",
  ),
) as RichMenuActionMap;

describe("Test Rich Menu action map", () => {
  it("covers the complete 2500x1686 image with six safe, non-overlapping areas", () => {
    expect(validateRichMenuActionMap(map)).toEqual({ valid: true, errors: [] });
  });

  it("is blocked from publishing while location and business data are unresolved", () => {
    expect(map.publishable).toBe(false);
    expect(map.areas.find((area) => area.id === "B_LOCATION")?.action).toEqual({
      type: "uri",
      uri: null,
      enabled: false,
    });
  });

  it("uses only stable Test postbacks for enabled actions", () => {
    const postbacks = map.areas
      .filter((area) => area.action.type === "postback")
      .map((area) => area.action.data);
    expect(postbacks).toEqual([
      "action=show_rewards",
      "action=check_today",
      "action=start_draft_order",
      "action=show_menu",
      "action=human_handoff",
    ]);
  });
});
