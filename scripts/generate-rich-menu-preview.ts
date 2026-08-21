import { readFile, writeFile } from "node:fs/promises";

type PreviewMap = {
  readonly name: string;
  readonly imagePath: string;
  readonly image: { readonly width: number; readonly height: number };
  readonly areas: readonly {
    readonly id: string;
    readonly label: string;
    readonly bounds: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };
    readonly action: { readonly type: string };
  }[];
};

const map = JSON.parse(
  await readFile(
    "docs/line-oa/production-mirror/test-rich-menu-action-map.json",
    "utf8",
  ),
) as PreviewMap;

const areaHtml = map.areas
  .map(({ id, label, bounds, action }) => {
    const left = (bounds.x / map.image.width) * 100;
    const top = (bounds.y / map.image.height) * 100;
    const width = (bounds.width / map.image.width) * 100;
    const height = (bounds.height / map.image.height) * 100;
    return `<div class="area ${action.type === "none" ? "none" : ""}" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%"><strong>${id}</strong><span>${label}</span><small>${action.type}</small></div>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="th">
<meta charset="utf-8">
<title>${map.name}</title>
<style>
  body{margin:0;padding:24px;background:#24150d;color:#fff;font-family:system-ui,sans-serif}
  h1{font-size:20px}
  .preview{position:relative;max-width:1250px;margin:auto}
  img{display:block;width:100%;height:auto}
  .area{position:absolute;box-sizing:border-box;border:3px solid #ff8a00;background:#ff8a0022;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;text-shadow:0 1px 2px #000}
  .area.none{border-color:#aaa;background:#7775}
  .area span{font-size:18px}.area small{font-size:12px}
</style>
<h1>${map.name} — local action preview</h1>
<div class="preview">
  <img src="../${map.imagePath}" alt="Rich Menu preview">
  ${areaHtml}
</div>
</html>
`;

await writeFile("artifacts/rich-menu-preview.html", html, "utf8");
console.log("Preview generated: artifacts/rich-menu-preview.html");
