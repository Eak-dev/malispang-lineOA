import type { FlexBubble, FlexComponent } from "./types.js";

const BRAND_BROWN = "#6B3F2A";
const BRAND_CREAM = "#FFF8EC";
const BRAND_ORANGE = "#E5A65B";

const buttons: ReadonlyArray<{
  label: string;
  data: string;
  primary?: boolean;
}> = [
  { label: "🥖 ดูเมนู", data: "test:show_menu" },
  { label: "🏷️ ดูราคา", data: "test:show_price" },
  { label: "📍 ที่ตั้งร้าน", data: "test:show_location" },
  { label: "🕒 เวลาทำการ", data: "test:show_hours" },
  { label: "📦 ราคาส่ง", data: "test:show_wholesale" },
  {
    label: "💬 คุยกับพนักงาน",
    data: "test:human_handoff",
    primary: true,
  },
];

function flexButton(
  label: string,
  data: string,
  primary = false,
): FlexComponent {
  return {
    type: "button",
    style: primary ? "primary" : "secondary",
    color: primary ? BRAND_BROWN : BRAND_ORANGE,
    height: "sm",
    action: {
      type: "postback",
      label,
      data,
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
        {
          type: "text",
          text: "TEST — ไม่รับออเดอร์/ชำระเงินจริง",
          color: "#B42318",
          size: "sm",
          weight: "bold",
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
      contents: buttons.map(({ label, data, primary }) =>
        flexButton(label, data, primary),
      ),
    },
  };
}

export const FLEX_MENU_ALT_TEXT = "เมนูช่วยเหลือมะลิปัง TEST";
