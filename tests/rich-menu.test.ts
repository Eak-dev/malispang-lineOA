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
  it("maps the original 2500x1686 five-panel image with safe, non-overlapping areas", () => {
    expect(validateRichMenuActionMap(map)).toEqual({ valid: true, errors: [] });
  });

  it("stays blocked from publishing while visual business claims are unresolved", () => {
    expect(map.publishable).toBe(false);
    expect(map.areas.every((area) => area.action.type === "postback")).toBe(
      true,
    );
  });

  it("uses only stable Test postbacks for enabled actions", () => {
    const postbacks = map.areas
      .filter((area) => area.action.type === "postback")
      .map((area) => area.action.data);
    expect(postbacks).toEqual([
      "test:show_rewards",
      "test:show_location",
      "test:show_delivery",
      "test:show_menu",
      "test:show_facebook",
    ]);
  });

  it("keeps staff contact outside the original five panels as a Quick Reply", () => {
    const staffQuickReply = (
      map as RichMenuActionMap & {
        staffQuickReply: { label: string; data: string };
      }
    ).staffQuickReply;
    expect(staffQuickReply).toEqual(
      expect.objectContaining({
        label: "คุยกับพนักงาน",
        data: "test:human_handoff",
      }),
    );
  });
});
