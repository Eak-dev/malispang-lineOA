import { readFile, stat } from "node:fs/promises";

import sharp from "sharp";

import {
  validateRichMenuActionMap,
  type RichMenuActionMap,
} from "../src/index.js";

const mapPath = "docs/line-oa/production-mirror/test-rich-menu-action-map.json";
const imagePath = "assets/test/malispang-test-rich-menu-publishable.jpeg";
const overlayPath = "assets/test/malispang-test-rich-menu-overlay.svg";

const map = JSON.parse(await readFile(mapPath, "utf8")) as RichMenuActionMap;
const result = validateRichMenuActionMap(map);
if (!result.valid) {
  throw new Error(`Invalid Rich Menu action map: ${result.errors.join("; ")}`);
}

const image = await readFile(imagePath);
if (image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff) {
  throw new Error("Rich Menu image must be a JPEG");
}
const imageStats = await stat(imagePath);
if (imageStats.size > 1_048_576) {
  throw new Error("Rich Menu image must be 1 MB or less");
}
const metadata = await sharp(image).metadata();
if (
  metadata.width !== map.image.width ||
  metadata.height !== map.image.height ||
  metadata.format !== "jpeg"
) {
  throw new Error(
    "Rich Menu JPEG dimensions or format do not match the manifest",
  );
}

const overlay = await readFile(overlayPath, "utf8");
if (
  !overlay.includes("ทุกๆ 50 บาท รับ 1 แต้ม") ||
  !overlay.includes(">39</text>") ||
  overlay.includes("100 บาท") ||
  overlay.includes(">59</text>")
) {
  throw new Error("Rich Menu visual claims do not match Owner decisions");
}

console.log(
  `Rich Menu validation passed: ${map.areas.length} areas, ${map.image.width}x${map.image.height}, ${imageStats.size} bytes, publishable=${map.publishable}`,
);
