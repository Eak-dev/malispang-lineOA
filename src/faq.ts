export type FaqIntent =
  "MENU" | "PRICE" | "LOCATION" | "OPENING_HOURS" | "STORAGE" | "WHOLESALE";

export interface ApprovedFaqRecord {
  readonly id: string;
  readonly intent: FaqIntent;
  readonly keywords: readonly string[];
  readonly answer: string;
  readonly approvalStatus: "APPROVED" | "DRAFT" | "REVOKED";
  readonly approvedBy?: string;
  readonly effectiveFrom: string;
  readonly expiresAt?: string;
}

export interface FaqLookupResult {
  readonly intent?: FaqIntent;
  readonly answer?: string;
  readonly status: "APPROVED" | "NO_MATCH" | "NOT_AUTHORITATIVE";
}

const intentKeywords: Readonly<Record<FaqIntent, readonly string[]>> = {
  MENU: ["มีเมนูอะไร", "ดูเมนู", "รายการขนม", "เมนูขนม"],
  PRICE: ["ราคา", "กี่บาท", "เท่าไหร่"],
  LOCATION: ["ที่ตั้ง", "พิกัด", "ร้านอยู่ไหน", "เดินทาง"],
  OPENING_HOURS: ["เวลาทำการ", "เปิดกี่โมง", "ปิดกี่โมง", "ร้านเปิด"],
  STORAGE: ["เก็บรักษา", "เก็บได้นาน", "แช่เย็น", "อายุขนม"],
  WHOLESALE: ["ราคาส่ง", "ขายส่ง", "สั่งจำนวนมาก"],
};

const intentPrecedence: readonly FaqIntent[] = [
  "WHOLESALE",
  "OPENING_HOURS",
  "STORAGE",
  "LOCATION",
  "MENU",
  "PRICE",
];

export class ApprovedFaqKnowledgeBase {
  constructor(
    private readonly records: readonly ApprovedFaqRecord[] = [],
    private readonly now: () => Date = () => new Date(),
  ) {}

  lookupText(text: string): FaqLookupResult {
    const normalized = normalize(text);
    const intent = intentPrecedence.find((candidate) =>
      intentKeywords[candidate].some((keyword) =>
        normalized.includes(normalize(keyword)),
      ),
    );
    if (intent) return this.lookupIntent(intent);

    const customRecord = this.records.find((record) =>
      record.keywords.some((keyword) =>
        normalized.includes(normalize(keyword)),
      ),
    );
    return customRecord
      ? this.lookupIntent(customRecord.intent)
      : { status: "NO_MATCH" };
  }

  lookupIntent(intent: FaqIntent): FaqLookupResult {
    const now = this.now().getTime();
    const record = this.records.find(
      (candidate) => candidate.intent === intent,
    );
    if (
      !record ||
      record.approvalStatus !== "APPROVED" ||
      !record.approvedBy?.trim() ||
      !record.answer.trim() ||
      Date.parse(record.effectiveFrom) > now ||
      (record.expiresAt !== undefined && Date.parse(record.expiresAt) <= now)
    ) {
      return { intent, status: "NOT_AUTHORITATIVE" };
    }
    return { intent, answer: record.answer, status: "APPROVED" };
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("th-TH").replace(/\s+/g, " ");
}
