import { mkdir, writeFile } from "node:fs/promises";

import { buildFlexMenu, validateFlexMenu } from "../src/index.js";

const flex = buildFlexMenu();
const result = validateFlexMenu(flex);
if (!result.valid)
  throw new Error(`Invalid Flex menu: ${result.errors.join("; ")}`);
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/flex-menu.json",
  `${JSON.stringify(flex, null, 2)}\n`,
  "utf8",
);
console.log("Flex validation passed: artifacts/flex-menu.json");
