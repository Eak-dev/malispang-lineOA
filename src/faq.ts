export const FAQ_INTENTS = [
  "MENU",
  "PRICE",
  "LOCATION",
  "OPENING_HOURS",
  "CONTACT",
  "PICKUP",
  "STORAGE",
  "ALLERGEN",
  "WHOLESALE",
  "ADVANCE_ORDER",
  "DELIVERY",
  "PROMOTION",
  "LOYALTY",
  "STOCK",
] as const;

export type FaqIntent = (typeof FAQ_INTENTS)[number];

export interface ApprovedFaqRecord {
  readonly id: string;
  readonly intent: FaqIntent;
  readonly keywords: readonly string[];
  readonly answer: string;
  readonly status: "APPROVED" | "DRAFT" | "REVOKED";
  readonly source: {
    readonly classification: "OWNER_APPROVED_REPOSITORY_RECORD";
    readonly reference: string;
  };
  readonly owner: string;
  readonly approvedAt: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string;
  readonly freshness: {
    readonly reviewAt: string;
    readonly maximumAgeDays: number;
  };
  readonly version: string;
  readonly checksum: string;
}

export interface FaqProvenance {
  readonly recordId: string;
  readonly sourceReference: string;
  readonly owner: string;
  readonly approvedAt: string;
  readonly version: string;
  readonly checksum: string;
}

export interface FaqLookupResult {
  readonly intent?: FaqIntent;
  readonly answer?: string;
  readonly provenance?: FaqProvenance;
  readonly status: "APPROVED" | "NO_MATCH" | "NOT_AUTHORITATIVE" | "CONFLICT";
}

const intentKeywords: Readonly<Record<FaqIntent, readonly string[]>> = {
  MENU: ["มีเมนูอะไร", "ดูเมนู", "รายการขนม", "เมนูขนม"],
  PRICE: ["ราคา", "กี่บาท", "เท่าไหร่"],
  LOCATION: ["ที่ตั้ง", "พิกัด", "ร้านอยู่ไหน", "ร้านอยู่ที่ไหน", "เดินทาง"],
  OPENING_HOURS: ["เวลาทำการ", "เปิดกี่โมง", "ปิดกี่โมง", "ร้านเปิด"],
  CONTACT: ["ติดต่อ", "เบอร์ติดต่อ", "ช่องทางติดต่อ"],
  PICKUP: ["รับสินค้า", "รับของ", "จุดรับสินค้า"],
  STORAGE: ["เก็บรักษา", "เก็บได้นาน", "เก็บได้กี่วัน", "แช่เย็น", "อายุขนม"],
  ALLERGEN: ["แพ้อาหาร", "สารก่อภูมิแพ้", "ส่วนผสมเพื่อการแพ้"],
  WHOLESALE: ["ราคาส่ง", "ขายส่ง", "สั่งจำนวนมาก"],
  ADVANCE_ORDER: ["สั่งล่วงหน้า", "วิธีสั่ง", "สั่งยังไง"],
  DELIVERY: ["delivery", "เดลิเวอรี", "ส่งถึงบ้าน"],
  PROMOTION: ["โปรโมชั่น", "โปรโมชัน", "มีโปร"],
  LOYALTY: ["สะสมแต้ม", "บัตรแต้ม", "แลกแต้ม"],
  STOCK: ["มีของไหม", "สต๊อก", "สต็อก", "ของวันนี้"],
};

const intentPrecedence: readonly FaqIntent[] = [
  "ALLERGEN",
  "STOCK",
  "PROMOTION",
  "LOYALTY",
  "WHOLESALE",
  "ADVANCE_ORDER",
  "OPENING_HOURS",
  "PICKUP",
  "CONTACT",
  "STORAGE",
  "DELIVERY",
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
    const timestamp = this.now().getTime();
    if (!Number.isFinite(timestamp)) {
      return { intent, status: "NOT_AUTHORITATIVE" };
    }

    const active = this.records.filter(
      (record) =>
        record.intent === intent &&
        record.status === "APPROVED" &&
        isInsideEffectiveWindow(record, timestamp),
    );
    if (active.length > 1) return { intent, status: "CONFLICT" };

    const record = active[0];
    if (!record || !isAuthoritative(record, timestamp)) {
      return { intent, status: "NOT_AUTHORITATIVE" };
    }

    return {
      intent,
      answer: record.answer,
      provenance: {
        recordId: record.id,
        sourceReference: record.source.reference,
        owner: record.owner,
        approvedAt: record.approvedAt,
        version: record.version,
        checksum: record.checksum,
      },
      status: "APPROVED",
    };
  }
}

function isInsideEffectiveWindow(
  record: ApprovedFaqRecord,
  timestamp: number,
): boolean {
  const start = Date.parse(record.effectiveFrom);
  const end = Date.parse(record.effectiveTo);
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start <= timestamp &&
    timestamp < end
  );
}

function isAuthoritative(
  record: ApprovedFaqRecord,
  timestamp: number,
): boolean {
  const approvedAt = Date.parse(record.approvedAt);
  const reviewAt = Date.parse(record.freshness.reviewAt);
  const maximumAgeMs = record.freshness.maximumAgeDays * 24 * 60 * 60 * 1_000;
  return (
    record.id.trim().length > 0 &&
    record.answer.trim().length > 0 &&
    !/TEST_SEED|TEST ONLY|ทดสอบระบบ/i.test(record.answer) &&
    record.source.classification === "OWNER_APPROVED_REPOSITORY_RECORD" &&
    record.source.reference.trim().length > 0 &&
    record.owner.trim().length > 0 &&
    record.version.trim().length > 0 &&
    /^[a-f0-9]{64}$/.test(record.checksum) &&
    Number.isFinite(approvedAt) &&
    approvedAt <= timestamp &&
    Number.isFinite(reviewAt) &&
    timestamp < reviewAt &&
    Number.isSafeInteger(record.freshness.maximumAgeDays) &&
    record.freshness.maximumAgeDays > 0 &&
    timestamp < approvedAt + maximumAgeMs
  );
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("th-TH").replace(/\s+/g, " ");
}
