import { describe, expect, it } from "vitest";

import { buildFlexMenu, validateFlexMenu } from "../src/index.js";

describe("Flex menu", () => {
  it("has the approved Thai title, prompt, and four actions", () => {
    const flex = buildFlexMenu();
    expect(JSON.stringify(flex)).toContain("สวัสดีค่ะ มะลิปังยินดีให้บริการ");
    expect(JSON.stringify(flex)).toContain(
      "เลือกหัวข้อด้านล่าง หรือพิมพ์คำถามถึงเราได้เลยนะคะ 😊",
    );
    expect(flex.footer.contents).toHaveLength(4);
    expect(
      flex.footer.contents.map((item) =>
        item.type === "button" ? item.action.label : "",
      ),
    ).toEqual([
      "🥖 เมนูและราคา",
      "🧾 สั่ง/จองล่วงหน้า",
      "📍 ที่ตั้งร้าน",
      "💬 คุยกับพนักงาน",
    ]);
  });

  it("passes the local Flex schema validator", () => {
    expect(validateFlexMenu(buildFlexMenu())).toEqual({
      valid: true,
      errors: [],
    });
  });
});
