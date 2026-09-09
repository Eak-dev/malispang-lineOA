import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const BENCHMARK_TEST = "tests/mp-06-wp2-benchmark.test.ts";

async function repositoryTestFiles(directory = "tests"): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.posix.join(directory, entry.name);
      if (entry.isDirectory()) return repositoryTestFiles(entryPath);
      return entry.isFile() && entry.name.endsWith(".test.ts")
        ? [entryPath]
        : [];
    }),
  );
  return files.flat().sort();
}

describe("MP-06 benchmark execution lanes", () => {
  it("keeps the long-running benchmark in one dedicated fresh-process lane", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["test:node:unit"]).toBe(
      `vitest run --config vitest.config.ts --exclude ${BENCHMARK_TEST}`,
    );
    expect(packageJson.scripts["test:node:benchmark"]).toBe(
      `vitest run ${BENCHMARK_TEST} --config vitest.config.ts`,
    );
    expect(packageJson.scripts["test:node"]).toBe(
      "pnpm test:node:unit && pnpm test:node:benchmark",
    );
  });

  it("keeps every Node test discoverable while excluding only the benchmark from the unit lane", async () => {
    const files = await repositoryTestFiles();
    const unitFiles = files.filter((file) => file !== BENCHMARK_TEST);
    const config = await readFile("vitest.config.ts", "utf8");

    expect(files).toContain(BENCHMARK_TEST);
    expect(unitFiles).toHaveLength(files.length - 1);
    expect(unitFiles).not.toContain(BENCHMARK_TEST);
    expect(config).toContain('include: ["tests/**/*.test.ts"]');
    expect(config).toContain('exclude: ["worker-tests/**/*.test.ts"]');
  });

  it("keeps Node and Worker lanes mandatory and propagates a lane failure", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.test).toBe("pnpm test:node && pnpm test:worker");
    expect(packageJson.scripts["test:node"]).toContain(" && ");
    expect(packageJson.scripts["test:node"]).not.toContain("||");
    expect(packageJson.scripts["test:node:benchmark"]).not.toContain("||");
  });

  it("retains the exact 5,000-case and evaluator invocation contracts", async () => {
    const benchmarkSource = await readFile(BENCHMARK_TEST, "utf8");
    const evaluatorSource = await readFile(
      "benchmark/mp-06/evaluator.ts",
      "utf8",
    );

    expect(benchmarkSource).toContain("expect(cases).toHaveLength(5000)");
    expect(evaluatorSource).toContain(
      "for (const item of cases) results.push(await evaluateCase(item));",
    );
    expect(
      evaluatorSource.match(/await executeActual\(benchmarkCase\)/gu),
    ).toHaveLength(2);
  });

  it("does not disable tests or add a deployment path", async () => {
    const files = await repositoryTestFiles();
    const forbiddenModifier = new RegExp(
      `\\.(?:${["skip", "only", "todo"].join("|")})\\s*\\(`,
      "u",
    );
    for (const file of files) {
      expect(await readFile(file, "utf8"), file).not.toMatch(forbiddenModifier);
    }

    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(
      Object.keys(packageJson.scripts).filter((name) =>
        name.startsWith("deploy:"),
      ),
    ).toEqual(["deploy:test"]);
  });
});
