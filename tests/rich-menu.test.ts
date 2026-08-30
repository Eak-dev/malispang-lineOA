import { readFileSync, statSync } from "node:fs";

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

const apiPayload = JSON.parse(
  readFileSync(
    "config/rich-menu/malispang-test-rich-menu-postback-v2.json",
    "utf8",
  ),
) as {
  name: string;
  selected: boolean;
  areas: {
    bounds: { x: number; y: number; width: number; height: number };
    action: {
      type: "postback" | "uri";
      data?: string;
      displayText?: string;
      uri?: string;
    };
  }[];
};

describe("Test Rich Menu action map", () => {
  it("maps the original 2500x1686 six-area grid without gaps or overlaps", () => {
    expect(validateRichMenuActionMap(map)).toEqual({ valid: true, errors: [] });
  });

  it("is publishable with the isolated reward area failing closed", () => {
    expect(map.publishable).toBe(true);
    expect(map).toMatchObject({
      account: "มะลิปัง TEST",
      chatBarLabel: "รู้จักมะลิปัง",
      defaultDisplay: "shown",
    });
  });

  it("uses exact TEST postbacks and the approved public URLs", () => {
    const postbackActions = map.areas
      .filter((area) => area.action.type === "postback")
      .map((area) => ({
        data: area.action.data,
        displayText: area.action.displayText,
      }));
    expect(postbackActions).toEqual([
      {
        data: "test:show_rewards",
        displayText: "สะสมแต้มและโปรโมชั่น",
      },
      { data: "test:show_delivery", displayText: "Delivery" },
      { data: "test:show_menu", displayText: "เมนูขนมปัง" },
    ]);
    expect(
      map.areas
        .filter((area) => area.action.type === "uri")
        .map((area) => area.action.uri),
    ).toEqual([
      "https://maps.app.goo.gl/mLTyUC1891a4uu7D9?g_st=ic",
      "https://www.facebook.com/share/18jLnt8dVY/?mibextid=wwXIfr",
    ]);
    expect(
      map.areas.filter((area) => area.action.type === "none"),
    ).toHaveLength(1);
  });

  it("keeps the API-ready payload TEST-only and omits the no-action panel", () => {
    expect(apiPayload).toMatchObject({
      name: "MalisPang TEST RM 39-50 postback v2",
      selected: true,
    });
    expect(apiPayload.areas).toHaveLength(5);
    expect(
      apiPayload.areas
        .filter((area) => area.action.type === "postback")
        .map((area) => area.action.data),
    ).toEqual(["test:show_rewards", "test:show_delivery", "test:show_menu"]);
    expect(JSON.stringify(apiPayload)).not.toMatch(/prod(uction)?[:_-]/i);
    expect(JSON.stringify(apiPayload)).not.toMatch(
      /token|secret|reward.?card.?url/i,
    );
    expect(
      apiPayload.areas.some(
        (area) =>
          area.bounds.x === 0 &&
          area.bounds.y === 843 &&
          area.bounds.width === 833 &&
          area.bounds.height === 843,
      ),
    ).toBe(false);

    const intendedAreas = map.areas
      .filter((area) => area.action.type !== "none")
      .map((area) => ({
        bounds: area.bounds,
        action:
          area.action.type === "postback"
            ? {
                type: area.action.type,
                data: area.action.data,
                displayText: area.action.displayText,
              }
            : { type: area.action.type, uri: area.action.uri },
      }));
    expect(apiPayload.areas).toEqual(intendedAreas);
  });

  it("rejects gaps, overlaps, unsafe URLs, and Production account names", () => {
    const clone = (): RichMenuActionMap => structuredClone(map);

    const gap = clone() as unknown as {
      areas: { bounds: { width: number } }[];
    };
    gap.areas[0]!.bounds.width -= 1;
    expect(
      validateRichMenuActionMap(gap as unknown as RichMenuActionMap).valid,
    ).toBe(false);

    const overlap = clone() as unknown as {
      areas: { bounds: { x: number } }[];
    };
    overlap.areas[1]!.bounds.x -= 1;
    expect(
      validateRichMenuActionMap(overlap as unknown as RichMenuActionMap).errors,
    ).toContain("areas A_REWARDS and B_LOCATION overlap");

    const unsafeUrl = clone() as unknown as {
      areas: { action: { uri?: string } }[];
    };
    unsafeUrl.areas[1]!.action.uri = "https://example.com/production";
    expect(
      validateRichMenuActionMap(unsafeUrl as unknown as RichMenuActionMap)
        .valid,
    ).toBe(false);

    const production = { ...clone(), account: "มะลิปัง" };
    expect(validateRichMenuActionMap(production).valid).toBe(false);

    const unsafePostback = clone() as unknown as {
      areas: { action: { data?: string } }[];
    };
    unsafePostback.areas[0]!.action.data = "prod:show_rewards";
    expect(
      validateRichMenuActionMap(unsafePostback as unknown as RichMenuActionMap)
        .valid,
    ).toBe(false);
  });

  it("records the approved 39-baht price and 50-baht earning rule", () => {
    const claims = (
      map as RichMenuActionMap & {
        visualClaims: {
          startingPriceThb: number;
          rewardSpendThbPerPoint: number;
          pointsEarned: number;
        };
      }
    ).visualClaims;
    expect(claims).toEqual({
      startingPriceThb: 39,
      rewardSpendThbPerPoint: 50,
      pointsEarned: 1,
    });
    const overlay = readFileSync(
      "assets/test/malispang-test-rich-menu-overlay.svg",
      "utf8",
    );
    expect(overlay).toContain("ทุกๆ 50 บาท รับ 1 แต้ม");
    expect(overlay).toContain(">39</text>");
    expect(overlay).not.toContain("100 บาท");
    expect(overlay).not.toContain(">59</text>");
  });

  it("produces a LINE-compatible JPEG smaller than 1 MB", () => {
    const image = readFileSync(
      "assets/test/malispang-test-rich-menu-publishable.jpeg",
    );
    expect([...image.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(
      statSync("assets/test/malispang-test-rich-menu-publishable.jpeg").size,
    ).toBeLessThanOrEqual(1_048_576);
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
