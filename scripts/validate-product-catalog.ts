import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

interface CatalogFile {
  readonly catalogVersion: string;
  readonly checksum: string;
  readonly approval: {
    readonly status: string;
    readonly ownerDecisionDate: string;
    readonly effectiveFrom: string;
    readonly effectiveUntil: string | null;
    readonly source: string;
  };
  readonly products: readonly {
    readonly sku: string;
    readonly displayName: string;
    readonly aliases: readonly string[];
    readonly size: string;
    readonly unitPriceSatang: number | null;
    readonly status: string;
    readonly promotionEligible: boolean;
  }[];
}

const path = resolve("config/product-catalog/test-approved-catalog.json");
const catalog = JSON.parse(await readFile(path, "utf8")) as CatalogFile;
const payload = { ...catalog, checksum: undefined };
const expected = `sha256:${createHash("sha256")
  .update(JSON.stringify(payload))
  .digest("hex")}`;

if (catalog.checksum !== expected) {
  throw new Error(`CATALOG_CHECKSUM_MISMATCH expected ${expected}`);
}
if (
  catalog.approval.status !== "APPROVED" ||
  catalog.approval.ownerDecisionDate !== "2026-09-01" ||
  catalog.products.length === 0
) {
  throw new Error("CATALOG_APPROVAL_INVALID");
}
const seen = new Set<string>();
for (const product of catalog.products) {
  if (seen.has(product.sku))
    throw new Error(`CATALOG_DUPLICATE_SKU ${product.sku}`);
  seen.add(product.sku);
  if (product.status === "APPROVED") {
    if (
      !Number.isSafeInteger(product.unitPriceSatang) ||
      (product.unitPriceSatang ?? 0) <= 0
    ) {
      throw new Error(`CATALOG_INVALID_PRICE ${product.sku}`);
    }
  } else if (product.status === "PRICE_BLOCKED") {
    if (product.unitPriceSatang !== null || product.promotionEligible) {
      throw new Error(`CATALOG_BLOCKED_ROW_UNSAFE ${product.sku}`);
    }
  } else {
    throw new Error(`CATALOG_INVALID_STATUS ${product.sku}`);
  }
}
console.log(
  `Product catalog valid: ${catalog.catalogVersion} (${catalog.products.length} rows)`,
);
