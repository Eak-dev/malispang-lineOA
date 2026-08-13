import type { CustomerAction, FlexBubble, FlexComponent } from "./types.js";

const BRAND_BROWN = "#6B3F2A";
const BRAND_CREAM = "#FFF8EC";
const BRAND_GOLD = "#D89B3C";

const buttons: ReadonlyArray<{ label: string; action: CustomerAction }> = [
  { label: "🥖 เมนูและราคา", action: "MENU_PRICE" },
  { label: "🧾 สั่ง/จองล่วงหน้า", action: "ADVANCE_ORDER" },
  { label: "📍 ที่ตั้งร้าน", action: "LOCATION" },
  { label: "💬 คุยกับพนักงาน", action: "HUMAN_HANDOFF" },
];

function flexButton(label: string, action: CustomerAction): FlexComponent {
  return {
    type: "button",
    style: action === "HUMAN_HANDOFF" ? "primary" : "secondary",
    color: action === "HUMAN_HANDOFF" ? BRAND_BROWN : BRAND_GOLD,
    height: "sm",
    action: {
      type: "postback",
      label,
      data: `action=${action}`,
      displayText: label,
    },
  };
}

export function buildFlexMenu(): FlexBubble {
  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: BRAND_BROWN,
      paddingAll: "20px",
      contents: [
        {
          type: "text",
          text: "MALI'S PANG • มะลิปัง",
          color: "#FFFFFF",
          size: "sm",
          weight: "bold",
          align: "center",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      backgroundColor: BRAND_CREAM,
      paddingAll: "22px",
      spacing: "md",
      contents: [
        {
          type: "text",
          text: "สวัสดีค่ะ มะลิปังยินดีให้บริการ",
          color: BRAND_BROWN,
          size: "xl",
          weight: "bold",
          wrap: true,
          align: "center",
        },
        {
          type: "text",
          text: "เลือกหัวข้อด้านล่าง หรือพิมพ์คำถามถึงเราได้เลยนะคะ 😊",
          color: "#5C4B43",
          size: "sm",
          weight: "regular",
          wrap: true,
          align: "center",
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#FFFFFF",
      paddingAll: "18px",
      spacing: "sm",
      contents: buttons.map(({ label, action }) => flexButton(label, action)),
    },
  };
}

export const FLEX_MENU_ALT_TEXT = "เมนูช่วยเหลือจากมะลิปัง";
