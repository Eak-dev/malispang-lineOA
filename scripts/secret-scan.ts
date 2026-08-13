import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  {
    encoding: "utf8",
  },
)
  .split("\n")
  .filter(Boolean)
  .filter(
    (file) => !file.startsWith("node_modules/") && !file.startsWith("dist/"),
  );

const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:sk|pk)-(?:live|proj)-[A-Za-z0-9_-]{16,}\b/,
  /\bBearer\s+[A-Za-z0-9._~-]{20,}\b/i,
  /channel[_ -]?(?:secret|access[_ -]?token)\s*[:=]\s*['"][^'"]+['"]/i,
];

const findings: string[] = [];
for (const file of files) {
  const data = await readFile(file, "utf8").catch(() => "");
  if (patterns.some((pattern) => pattern.test(data))) findings.push(file);
}
if (findings.length)
  throw new Error(`Potential secret material found in: ${findings.join(", ")}`);
console.log(`Secret scan passed: ${files.length} files checked`);
