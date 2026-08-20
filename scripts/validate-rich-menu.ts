import { readFile } from "node:fs/promises";

import {
  validateRichMenuActionMap,
  type RichMenuActionMap,
} from "../src/index.js";

const mapPath = "docs/line-oa/production-mirror/test-rich-menu-action-map.json";
const imagePath = "assets/test/malispang-test-rich-menu-original.png";

const map = JSON.parse(await readFile(mapPath, "utf8")) as RichMenuActionMap;
const result = validateRichMenuActionMap(map);
if (!result.valid) {
  throw new Error(`Invalid Rich Menu action map: ${result.errors.join("; ")}`);
}

const image = await readFile(imagePath);
if (image.toString("ascii", 1, 4) !== "PNG") {
  throw new Error("Rich Menu image must be a PNG");
}
const width = image.readUInt32BE(16);
const height = image.readUInt32BE(20);
if (width !== map.image.width || height !== map.image.height) {
  throw new Error(
    `Rich Menu image is ${width}x${height}; expected ${map.image.width}x${map.image.height}`,
  );
}

console.log(
  `Rich Menu validation passed: ${map.areas.length} areas, ${width}x${height}, publishable=${map.publishable}`,
);
