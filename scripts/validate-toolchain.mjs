import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const EXPECTED_NODE_VERSION = "24.19.0";
export const EXPECTED_PNPM_VERSION = "11.19.0";

const EXACT_VERSION = /^\d+\.\d+\.\d+$/;
const PACKAGE_MANAGER = /^pnpm@(\d+\.\d+\.\d+)$/;
/** @type {ReadonlyMap<string, string>} */
const OBSOLETE_SETTING_KEYS = new Map([
  ["packagemanagerstrictversion", "packageManagerStrictVersion"],
  ["managepackagemanagerversions", "managePackageManagerVersions"],
  ["packagemanagerstrict", "packageManagerStrict"],
]);

const REMEDIATION =
  "Activate Node 24.19.0 from .node-version, install pnpm 11.19.0 exactly, then rerun pnpm validate:toolchain.";

/**
 * @typedef {object} ToolchainSnapshot
 * @property {string | null} packageManager
 * @property {string | null} enginesNode
 * @property {string | null} enginesPnpm
 * @property {string | null} preinstallScript
 * @property {string | null} validateToolchainScript
 * @property {string | null} checkScript
 * @property {string | null} nodeVersionFile
 * @property {string | null} actualNodeVersion
 * @property {string | null} actualPnpmVersion
 * @property {string[]} obsoletePnpmSettings
 */

/**
 * @typedef {object} ToolchainError
 * @property {string} code
 * @property {string} expected
 * @property {string} actual
 * @property {string} remediation
 */

/**
 * @typedef {object} ValidationOptions
 * @property {string=} rootDir
 * @property {string=} actualNodeVersion
 * @property {string=} actualPnpmVersion
 * @property {{log: (line: string) => void, error: (line: string) => void}=} reporter
 */

/** @param {unknown} value */
function safeVersion(value) {
  return typeof value === "string" && EXACT_VERSION.test(value)
    ? value
    : value === null || value === undefined || value === ""
      ? "missing"
      : "invalid";
}

/**
 * @param {string} code
 * @param {string} expected
 * @param {string} actual
 * @param {string=} remediation
 * @returns {ToolchainError}
 */
function makeError(code, expected, actual, remediation = REMEDIATION) {
  return { code, expected, actual, remediation };
}

/**
 * @param {string[]} configurationTexts
 * @returns {string[]}
 */
export function findObsoletePnpmSettings(configurationTexts) {
  /** @type {Set<string>} */
  const found = new Set();
  for (const text of configurationTexts) {
    for (const rawLine of text.split(/\r?\n/u)) {
      const line = rawLine.replace(/\s+#.*$/u, "").trim();
      const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*[:=]/u.exec(line);
      if (!match?.[1]) continue;
      const normalized = match[1].replace(/[-_]/gu, "").toLowerCase();
      const canonical = OBSOLETE_SETTING_KEYS.get(normalized);
      if (canonical) found.add(canonical);
    }
  }
  return [...found].sort();
}

/**
 * @param {ToolchainSnapshot} snapshot
 * @returns {ToolchainError[]}
 */
export function validateToolchainSnapshot(snapshot) {
  /** @type {ToolchainError[]} */
  const errors = [];
  const packageManager = snapshot.packageManager;

  if (typeof packageManager !== "string" || packageManager.length === 0) {
    errors.push(
      makeError(
        "PACKAGE_MANAGER_MISSING",
        `pnpm@${EXPECTED_PNPM_VERSION}`,
        "missing",
      ),
    );
  } else {
    const match = PACKAGE_MANAGER.exec(packageManager);
    if (!match?.[1]) {
      errors.push(
        makeError(
          packageManager.startsWith("pnpm@")
            ? "PACKAGE_MANAGER_VERSION_NOT_EXACT"
            : "PACKAGE_MANAGER_NOT_PNPM",
          `pnpm@${EXPECTED_PNPM_VERSION}`,
          packageManager.startsWith("pnpm@") ? "invalid" : "non-pnpm",
        ),
      );
    } else if (match[1] !== EXPECTED_PNPM_VERSION) {
      errors.push(
        makeError(
          "PACKAGE_MANAGER_VERSION_MISMATCH",
          EXPECTED_PNPM_VERSION,
          safeVersion(match[1]),
        ),
      );
    }
  }

  /** @type {Array<[string, string | null, string]>} */
  const versionChecks = [
    ["NODE_ENGINE_MISMATCH", snapshot.enginesNode, EXPECTED_NODE_VERSION],
    ["PNPM_ENGINE_MISMATCH", snapshot.enginesPnpm, EXPECTED_PNPM_VERSION],
    [
      "NODE_VERSION_FILE_MISMATCH",
      snapshot.nodeVersionFile,
      EXPECTED_NODE_VERSION,
    ],
    [
      "NODE_RUNTIME_VERSION_MISMATCH",
      snapshot.actualNodeVersion,
      EXPECTED_NODE_VERSION,
    ],
    [
      "PNPM_RUNTIME_VERSION_MISMATCH",
      snapshot.actualPnpmVersion,
      EXPECTED_PNPM_VERSION,
    ],
  ];
  for (const [code, actual, expected] of versionChecks) {
    if (actual !== expected) {
      errors.push(makeError(code, expected, safeVersion(actual)));
    }
  }

  /** @type {Array<[string, string | null, string]>} */
  const scriptChecks = [
    [
      "PREINSTALL_HOOK_MISMATCH",
      snapshot.preinstallScript,
      "node scripts/validate-toolchain.mjs",
    ],
    [
      "VALIDATE_TOOLCHAIN_SCRIPT_MISMATCH",
      snapshot.validateToolchainScript,
      "node scripts/validate-toolchain.mjs",
    ],
  ];
  for (const [code, actual, expected] of scriptChecks) {
    if (actual !== expected) {
      errors.push(
        makeError(
          code,
          expected,
          actual === null || actual === "" ? "missing" : "invalid",
        ),
      );
    }
  }

  if (
    typeof snapshot.checkScript !== "string" ||
    !snapshot.checkScript.startsWith("pnpm validate:toolchain && ")
  ) {
    errors.push(
      makeError(
        "CHECK_CHAIN_MISSING_TOOLCHAIN_GATE",
        "pnpm validate:toolchain first",
        snapshot.checkScript ? "invalid" : "missing",
      ),
    );
  }

  for (const setting of snapshot.obsoletePnpmSettings) {
    errors.push(
      makeError(
        "OBSOLETE_PNPM_SETTING",
        "absent",
        setting,
        "Remove the obsolete pnpm strict-version setting; exact versions are enforced by package.json, .node-version, and this validator.",
      ),
    );
  }

  return errors;
}

/** @param {ToolchainSnapshot} snapshot */
export function evaluateToolchainSnapshot(snapshot) {
  const errors = validateToolchainSnapshot(snapshot);
  return {
    ok: errors.length === 0,
    exitCode: errors.length === 0 ? 0 : 1,
    errors,
  };
}

/**
 * @param {ToolchainError[]} errors
 * @returns {string[]}
 */
export function formatToolchainErrors(errors) {
  return errors.map(
    (error) =>
      `[${error.code}] expected=${error.expected} actual=${error.actual}; remediation=${error.remediation}`,
  );
}

/** @param {string} path */
function readIfPresent(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

/** @param {unknown} value */
function recordOrEmpty(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {};
}

/** @param {unknown} value */
function stringOrNull(value) {
  return typeof value === "string" ? value : null;
}

/** @returns {string | null} */
function detectPnpmVersion() {
  const result = spawnSync("pnpm", ["--version"], {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

/**
 * @param {ValidationOptions=} options
 * @returns {ToolchainSnapshot}
 */
export function loadToolchainSnapshot(options = {}) {
  const rootDir =
    options.rootDir ?? resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const packageJsonPath = resolve(rootDir, "package.json");
  const nodeVersionPath = resolve(rootDir, ".node-version");
  /** @type {unknown} */
  const parsedPackageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const packageJson = recordOrEmpty(parsedPackageJson);
  const engines = recordOrEmpty(packageJson.engines);
  const scripts = recordOrEmpty(packageJson.scripts);
  const configurationTexts = [
    readIfPresent(resolve(rootDir, ".npmrc")),
    readIfPresent(resolve(rootDir, "pnpm-workspace.yaml")),
  ];

  return {
    packageManager: stringOrNull(packageJson.packageManager),
    enginesNode: stringOrNull(engines.node),
    enginesPnpm: stringOrNull(engines.pnpm),
    preinstallScript: stringOrNull(scripts.preinstall),
    validateToolchainScript: stringOrNull(scripts["validate:toolchain"]),
    checkScript: stringOrNull(scripts.check),
    nodeVersionFile: existsSync(nodeVersionPath)
      ? readFileSync(nodeVersionPath, "utf8").trim()
      : null,
    actualNodeVersion: options.actualNodeVersion ?? process.versions.node,
    actualPnpmVersion: options.actualPnpmVersion ?? detectPnpmVersion(),
    obsoletePnpmSettings: findObsoletePnpmSettings(configurationTexts),
  };
}

/**
 * @param {ValidationOptions=} options
 * @returns {number}
 */
export function runToolchainValidation(options = {}) {
  const reporter = options.reporter ?? {
    log: (line) => process.stdout.write(`${line}\n`),
    error: (line) => process.stderr.write(`${line}\n`),
  };
  /** @type {ReturnType<typeof evaluateToolchainSnapshot>} */
  let result;
  try {
    result = evaluateToolchainSnapshot(loadToolchainSnapshot(options));
  } catch {
    reporter.error("Toolchain validation failed:");
    reporter.error(
      `[TOOLCHAIN_CONTRACT_UNREADABLE] expected=readable committed declarations actual=invalid; remediation=${REMEDIATION}`,
    );
    return 1;
  }
  if (result.ok) {
    reporter.log(
      `Toolchain validation passed: Node ${EXPECTED_NODE_VERSION}, pnpm ${EXPECTED_PNPM_VERSION}, declarations consistent`,
    );
  } else {
    reporter.error("Toolchain validation failed:");
    for (const line of formatToolchainErrors(result.errors))
      reporter.error(line);
  }
  return result.exitCode;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = runToolchainValidation();
}
