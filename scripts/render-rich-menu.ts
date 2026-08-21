import { copyFile, mkdir, readFile } from "node:fs/promises";

import sharp from "sharp";

const sourcePath = "assets/test/malispang-test-rich-menu-original.png";
const overlayPath = "assets/test/malispang-test-rich-menu-overlay.svg";
const outputPath = "assets/test/malispang-test-rich-menu-publishable.jpeg";
const publicPath = "public/rich-menu/malispang-test-rich-menu.jpeg";

const source = await readFile(sourcePath);
const overlay = await readFile(overlayPath);

const metadata = await sharp(source).metadata();
if (
  metadata.width !== 2500 ||
  metadata.height !== 1686 ||
  metadata.format !== "png"
) {
  throw new Error("Rich Menu source must be a 2500x1686 PNG");
}

await sharp(source)
  .composite([{ input: overlay, top: 0, left: 0 }])
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(outputPath);

await mkdir("public/rich-menu", { recursive: true });
await copyFile(outputPath, publicPath);

console.log(outputPath);
