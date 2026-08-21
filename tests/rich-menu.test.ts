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

  it("uses safe native text actions and the exact approved public URLs", () => {
    const textActions = map.areas
      .filter((area) => area.action.type === "text")
      .map((area) => area.action.text);
    expect(textActions).toEqual([
      "สะสมแต้มและโปรโมชั่น",
      "Delivery",
      "เมนูขนมปัง",
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
