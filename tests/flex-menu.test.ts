import { describe, expect, it } from "vitest";

import { buildFlexMenu, validateFlexMenu } from "../src/index.js";

describe("Flex menu", () => {
  it("has the approved Thai title, prompt, and six safe actions", () => {
    const flex = buildFlexMenu();
    expect(JSON.stringify(flex)).toContain("สวัสดีค่ะ มะลิปังยินดีให้บริการ");
    expect(JSON.stringify(flex)).toContain(
      "เลือกหัวข้อด้านล่าง หรือพิมพ์คำถามถึงเราได้เลยนะคะ 😊",
    );
    expect(JSON.stringify(flex)).toContain("TEST — ไม่รับออเดอร์/ชำระเงินจริง");
    expect(flex.footer.contents).toHaveLength(6);
    expect(
      flex.footer.contents.map((item) =>
        item.type === "button" ? item.action.label : "",
      ),
    ).toEqual([
      "🥖 ดูเมนู",
      "🏷️ ดูราคา",
      "📍 ที่ตั้งร้าน",
      "🕒 เวลาทำการ",
      "📦 ราคาส่ง",
      "💬 คุยกับพนักงาน",
    ]);
    expect(
      flex.footer.contents.map((item) =>
        item.type === "button" ? item.action.data : "",
      ),
    ).toEqual([
      "test:show_menu",
      "test:show_price",
      "test:show_location",
      "test:show_hours",
      "test:show_wholesale",
      "test:human_handoff",
    ]);
  });

  it("passes the local Flex schema validator", () => {
    expect(validateFlexMenu(buildFlexMenu())).toEqual({
      valid: true,
      errors: [],
    });
  });
});
