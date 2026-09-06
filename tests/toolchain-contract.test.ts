import { describe, expect, it } from "vitest";

import {
  evaluateToolchainSnapshot,
  findObsoletePnpmSettings,
  formatToolchainErrors,
  loadToolchainSnapshot,
  runToolchainValidation,
} from "../scripts/validate-toolchain.mjs";

const EXPECTED_NODE = "24.19.0";
const EXPECTED_PNPM = "11.19.0";

function validSnapshot() {
  return {
    packageManager: `pnpm@${EXPECTED_PNPM}`,
    enginesNode: EXPECTED_NODE,
    enginesPnpm: EXPECTED_PNPM,
    preinstallScript: "node scripts/validate-toolchain.mjs",
    validateToolchainScript: "node scripts/validate-toolchain.mjs",
    checkScript: "pnpm validate:toolchain && pnpm test",
    nodeVersionFile: EXPECTED_NODE,
    actualNodeVersion: EXPECTED_NODE,
    actualPnpmVersion: EXPECTED_PNPM,
    obsoletePnpmSettings: [] as string[],
  };
}

function expectFailure(
  change: (snapshot: ReturnType<typeof validSnapshot>) => void,
  code: string,
) {
  const snapshot = validSnapshot();
  change(snapshot);
  const result = evaluateToolchainSnapshot(snapshot);
  expect(result.ok).toBe(false);
  expect(result.exitCode).toBe(1);
  expect(result.errors.map((error) => error.code)).toContain(code);
}

describe("MP-06 WP5 exact toolchain contract", () => {
  it("accepts Node 24.19.0 and pnpm 11.19.0", () => {
    expect(evaluateToolchainSnapshot(validSnapshot())).toEqual({
      ok: true,
      exitCode: 0,
      errors: [],
    });
  });

  it.each(["24.18.0", "24.20.0", "23.19.0", "25.19.0"])(
    "rejects Node runtime %s",
    (version) =>
      expectFailure((snapshot) => {
        snapshot.actualNodeVersion = version;
      }, "NODE_RUNTIME_VERSION_MISMATCH"),
  );

  it.each(["11.18.0", "11.20.0", "10.19.0", "12.19.0"])(
    "rejects pnpm runtime %s",
    (version) =>
      expectFailure((snapshot) => {
        snapshot.actualPnpmVersion = version;
      }, "PNPM_RUNTIME_VERSION_MISMATCH"),
  );

  it("rejects a non-pnpm package manager", () => {
    expectFailure((snapshot) => {
      snapshot.packageManager = "npm@11.19.0";
    }, "PACKAGE_MANAGER_NOT_PNPM");
  });

  it("rejects a missing packageManager declaration", () => {
    expectFailure((snapshot) => {
      snapshot.packageManager = "";
    }, "PACKAGE_MANAGER_MISSING");
  });

  it("rejects a missing Node version file", () => {
    expectFailure((snapshot) => {
      snapshot.nodeVersionFile = "";
    }, "NODE_VERSION_FILE_MISMATCH");
  });

  it("rejects drift among toolchain declarations", () => {
    const snapshot = validSnapshot();
    snapshot.enginesNode = "24.18.0";
    snapshot.enginesPnpm = "11.20.0";
    snapshot.nodeVersionFile = "24.20.0";
    expect(
      evaluateToolchainSnapshot(snapshot).errors.map((error) => error.code),
    ).toEqual(
      expect.arrayContaining([
        "NODE_ENGINE_MISMATCH",
        "PNPM_ENGINE_MISMATCH",
        "NODE_VERSION_FILE_MISMATCH",
      ]),
    );
  });

  it.each([
    ["enginesNode", "^24.19.0", "NODE_ENGINE_MISMATCH"],
    ["enginesNode", ">=24.19.0", "NODE_ENGINE_MISMATCH"],
    ["enginesPnpm", "11.x", "PNPM_ENGINE_MISMATCH"],
    ["nodeVersionFile", "v24.19.0", "NODE_VERSION_FILE_MISMATCH"],
  ] as const)("rejects non-exact declaration %s=%s", (field, value, code) => {
    expectFailure((snapshot) => {
      snapshot[field] = value;
    }, code);
  });

  it.each(["pnpm@^11.19.0", "pnpm@>=11.19.0", "pnpm@11.x", "pnpm@bad"])(
    "rejects non-exact or malformed packageManager %s",
    (packageManager) =>
      expectFailure((snapshot) => {
        snapshot.packageManager = packageManager;
      }, "PACKAGE_MANAGER_VERSION_NOT_EXACT"),
  );

  it("rejects malformed engine and runtime versions", () => {
    const snapshot = validSnapshot();
    snapshot.enginesNode = "secret-looking-value";
    snapshot.actualPnpmVersion = "not-semver";
    const result = evaluateToolchainSnapshot(snapshot);
    expect(result.exitCode).toBe(1);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "NODE_ENGINE_MISMATCH",
        "PNPM_RUNTIME_VERSION_MISMATCH",
      ]),
    );
    expect(formatToolchainErrors(result.errors).join("\n")).not.toContain(
      "secret-looking-value",
    );
  });

  it("rejects obsolete pnpm strict-version settings", () => {
    const found = findObsoletePnpmSettings([
      "packageManagerStrictVersion=true\nmanage-package-manager-versions=false",
      "packageManagerStrict: true",
    ]);
    const snapshot = validSnapshot();
    snapshot.obsoletePnpmSettings = found;
    const result = evaluateToolchainSnapshot(snapshot);
    expect(found).toEqual([
      "managePackageManagerVersions",
      "packageManagerStrict",
      "packageManagerStrictVersion",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.errors).toHaveLength(3);
    expect(
      result.errors.every((error) => error.code === "OBSOLETE_PNPM_SETTING"),
    ).toBe(true);
  });

  it("rejects lifecycle or validation-chain drift", () => {
    const snapshot = validSnapshot();
    snapshot.preinstallScript = "echo skipped";
    snapshot.validateToolchainScript = "echo skipped";
    snapshot.checkScript = "pnpm test";
    expect(
      evaluateToolchainSnapshot(snapshot).errors.map((error) => error.code),
    ).toEqual(
      expect.arrayContaining([
        "PREINSTALL_HOOK_MISMATCH",
        "VALIDATE_TOOLCHAIN_SCRIPT_MISMATCH",
        "CHECK_CHAIN_MISSING_TOOLCHAIN_GATE",
      ]),
    );
  });

  it.each([
    ["Node", "24.18.0", EXPECTED_PNPM],
    ["pnpm", EXPECTED_NODE, "11.18.0"],
  ])(
    "returns non-zero from the real entrypoint for simulated %s mismatch",
    (_tool, actualNodeVersion, actualPnpmVersion) => {
      const output = { log: [] as string[], error: [] as string[] };
      expect(
        runToolchainValidation({
          actualNodeVersion,
          actualPnpmVersion,
          reporter: {
            log: (line) => output.log.push(line),
            error: (line) => output.error.push(line),
          },
        }),
      ).toBe(1);
      expect(output.error[0]).toBe("Toolchain validation failed:");
      expect(output.error.join("\n")).not.toContain("process.env");
    },
  );

  it("fails closed without printing a sensitive path when declarations cannot be read", () => {
    const output = { log: [] as string[], error: [] as string[] };
    const rootDir = "/test-only/sensitive/missing-toolchain-root";
    expect(
      runToolchainValidation({
        rootDir,
        actualNodeVersion: EXPECTED_NODE,
        actualPnpmVersion: EXPECTED_PNPM,
        reporter: {
          log: (line) => output.log.push(line),
          error: (line) => output.error.push(line),
        },
      }),
    ).toBe(1);
    const errorText = output.error.join("\n");
    expect(errorText).toContain("TOOLCHAIN_CONTRACT_UNREADABLE");
    expect(errorText).not.toContain(rootDir);
  });

  it("loads and validates the committed repository declarations", () => {
    const result = evaluateToolchainSnapshot(
      loadToolchainSnapshot({
        actualNodeVersion: EXPECTED_NODE,
        actualPnpmVersion: EXPECTED_PNPM,
      }),
    );
    expect(result).toEqual({ ok: true, exitCode: 0, errors: [] });
  });
});
