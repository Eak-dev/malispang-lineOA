export type ConversationIntent =
  | "SENSITIVE_PERSONAL_DATA"
  | "HIGH_RISK"
  | "ALLERGEN"
  | "STOCK"
  | "PROMOTION"
  | "WHOLESALE"
  | "ADVANCE_ORDER"
  | "LOYALTY_REDEMPTION"
  | "STAFF"
  | "FLEX_MENU"
  | "MENU"
  | "CONTACT"
  | "PICKUP"
  | "PRICE"
  | "LOCATION"
  | "HOURS"
  | "STORAGE"
  | "LOYALTY"
  | "DELIVERY"
  | "AMBIGUOUS"
  | "UNKNOWN";

export const MENU_TEXT_LEXICON = [
  "เมนู",
  "ขอเมนู",
  "ขอเมนูหน่อย",
  "เมนูขนมปัง",
  "มีเมนูอะไรบ้าง",
  "มีอะไรบ้าง",
  "มีไรบ้าง",
  "ขอดูเมนู",
  "รายการขนม",
  "ดูเมนู",
  "เมณู",
  "ขอเมณูหน่อย",
  "เมนูู",
] as const;

const AMBIGUOUS_TEXTS = [
  "เท่าไหร่",
  "เท่าไร",
  "มีไหม",
  "ได้ไหม",
  "เอาอันนี้",
  "อันนี้",
  "สนใจ",
  "สนใจค่ะ",
  "ขอรายละเอียด",
  "ขอรายละเอียดค่ะ",
] as const;

export function detectConversationIntent(text: string): ConversationIntent {
  const normalized = normalizeConversationText(text);

  if (isExactly(normalized, ["สะสมแต้มและโปรโมชั่น"])) return "LOYALTY";
  if (isExactly(normalized, ["delivery"])) return "DELIVERY";
  if (containsSensitivePersonalData(normalized)) {
    return "SENSITIVE_PERSONAL_DATA";
  }
  if (
    includesAny(normalized, [
      "ชำระเงิน",
      "แจ้งโอน",
      "โอนเงิน",
      "สลิป",
      "คืนเงิน",
      "ร้องเรียน",
      "สินค้ามีปัญหา",
      "ไม่พอใจ",
    ])
  ) {
    return "HIGH_RISK";
  }
  if (
    includesAny(normalized, [
      "แพ้อาหาร",
      "สารก่อภูมิแพ้",
      "ส่วนผสมเพื่อการแพ้",
      "แพ้แป้ง",
      "แพ้นม",
      "แพ้ไข่",
      "แพ้ถั่ว",
      "แพ้กลูเตน",
    ])
  ) {
    return "ALLERGEN";
  }
  if (
    includesAny(normalized, [
      "มีของไหม",
      "มีของมั้ย",
      "สต๊อก",
      "สต็อก",
      "สต๊อค",
      "สต็อค",
      "ของวันนี้",
      "ของเหลือไหม",
      "เช็กสต๊อก",
      "เช็คสต๊อก",
      "ไส้พิเศษวันนี้",
    ])
  ) {
    return "STOCK";
  }
  if (
    includesAny(normalized, [
      "โปรโมชั่นพิเศษ",
      "โปรโมชันพิเศษ",
      "โปรวันนี้",
      "โปรโมชั่นวันนี้",
      "โปรโมชันวันนี้",
      "ไส้พิเศษ",
      "มีโปร",
      "โปรโมชั่น",
      "โปรโมชัน",
    ]) ||
    isExactly(normalized, ["โปร", "โปรฯ"])
  ) {
    return "PROMOTION";
  }
  if (
    includesAny(normalized, [
      "ออเดอร์จำนวนมาก",
      "สั่งจำนวนมาก",
      "สั่งเยอะ",
      "จัดเลี้ยง",
      "ราคาส่ง",
      "ขายส่ง",
      "ขายสง",
    ])
  ) {
    return "WHOLESALE";
  }
  if (
    includesAny(normalized, [
      "พรีออเดอร์",
      "พรีออเดอ",
      "preorder",
      "สั่งล่วงหน้า",
      "จองล่วงหน้า",
      "สั่งไว้ก่อน",
      "วันรับสินค้า",
      "รับสินค้าวัน",
      "วิธีสั่ง",
      "สั่งยังไง",
      "สั่งอย่างไร",
    ])
  ) {
    return "ADVANCE_ORDER";
  }
  if (includesAny(normalized, ["แลกรางวัล", "แลกแต้ม", "ใช้แต้ม"])) {
    return "LOYALTY_REDEMPTION";
  }
  if (
    includesAny(normalized, [
      "คุยกับพนักงาน",
      "ขอคุยกับพนักงาน",
      "คุยกับคน",
      "ขอคุยกับคน",
      "พนักงงาน",
    ]) ||
    isExactly(normalized, ["พนักงาน", "แอดมิน", "admin", "เจ้าหน้าที่"])
  ) {
    return "STAFF";
  }
  if (
    includesAny(normalized, ["เมนูหลัก", "เมนูช่วยเหลือ"]) ||
    isExactly(normalized, ["help", "ตัวเลือก"])
  ) {
    return "FLEX_MENU";
  }
  if (includesAny(normalized, MENU_TEXT_LEXICON)) return "MENU";
  if (
    includesAny(normalized, [
      "ติดต่อร้าน",
      "เบอร์ติดต่อ",
      "ช่องทางติดต่อ",
      "ติดต่อยังไง",
    ]) ||
    normalized === "ติดต่อ"
  ) {
    return "CONTACT";
  }
  if (
    includesAny(normalized, ["รับสินค้าที่ไหน", "จุดรับสินค้า", "รับของที่ไหน"])
  ) {
    return "PICKUP";
  }
  if (
    includesAny(normalized, [
      "ราคา",
      "ราาคา",
      "กี่บาท",
      "ราคาเท่าไหร่",
      "ราคาเท่าไร",
      "ขอราคา",
    ])
  ) {
    return "PRICE";
  }
  if (
    includesAny(normalized, [
      "ที่ตั้ง",
      "ร้านอยู่ที่ไหน",
      "ร้านอยู่ไหน",
      "ร้านอยุ่ไหน",
      "ร้านยุไหน",
      "พิกัดร้าน",
      "แผนที่",
      "เดินทาง",
    ]) ||
    isExactly(normalized, ["พิกัด"])
  ) {
    return "LOCATION";
  }
  if (
    includesAny(normalized, [
      "เปิดกี่โมง",
      "ปิดกี่โมง",
      "เวลาทำการ",
      "ร้านเปิด",
      "เปิดทุกวันไหม",
    ]) ||
    isExactly(normalized, ["เวลา", "กี่โมง"])
  ) {
    return "HOURS";
  }
  if (
    includesAny(normalized, [
      "เก็บได้กี่วัน",
      "เก็บได้นาน",
      "เก็บยังไง",
      "เก็บยังงัย",
      "เก็บรักษา",
      "แช่เย็น",
      "แช่ตู้เย็น",
      "อายุขนม",
    ])
  ) {
    return "STORAGE";
  }
  if (
    includesAny(normalized, [
      "กติกาแต้ม",
      "สะสมแต้ม",
      "สะสมเเต้ม",
      "บัตรแต้ม",
      "บัตรสะสมแต้ม",
    ]) ||
    isExactly(normalized, ["แต้ม", "คะแนน"])
  ) {
    return "LOYALTY";
  }
  if (
    includesAny(normalized, [
      "delivery",
      "เดลิเวอรี",
      "เดลิเวอรี่",
      "ส่งถึงบ้าน",
    ])
  ) {
    return "DELIVERY";
  }
  if (isExactly(normalized, AMBIGUOUS_TEXTS)) return "AMBIGUOUS";
  return "UNKNOWN";
}

export function normalizeConversationText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLocaleLowerCase("th-TH")
    .replace(/[“”"'`…!?！？,.，。:;()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(value: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) =>
    value.includes(normalizeConversationText(keyword)),
  );
}

function isExactly(value: string, keywords: readonly string[]): boolean {
  const concise = value
    .replace(/(?:นะคะ|นะครับ|ค่ะ|คะ|ครับ|จ้า|จ้ะ|นะ)$/u, "")
    .trim();
  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeConversationText(keyword);
    return value === normalizedKeyword || concise === normalizedKeyword;
  });
}

function containsSensitivePersonalData(value: string): boolean {
  return (
    /(?:^|\D)0\d{8,9}(?:\D|$)/.test(value) ||
    includesAny(value, ["เลขบัตร", "ที่อยู่จัดส่ง", "บ้านเลขที่"])
  );
}
