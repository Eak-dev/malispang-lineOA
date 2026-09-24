// @ts-check
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_BYTES = 5 * 1024 * 1024;
const sensitiveName =
  /(^|\/)(?:\.env(?:\.|$)|.*(?:secret|token|credential|private.?key|customer|raw.?chat|slip).*)/iu;
const sensitiveContent =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{12,}\b|\bBearer\s+[A-Za-z0-9._-]{12,}\b/iu;
/** @param {string | Buffer} value */
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

/** Select only a system-owned Git executable, never PATH or caller input. */
export function devOperationsGitExecutable() {
  if (process.platform === "darwin") {
    const binary = "/Library/Developer/CommandLineTools/usr/bin/git";
    const paths = [
      "/Library",
      "/Library/Developer",
      "/Library/Developer/CommandLineTools",
      "/Library/Developer/CommandLineTools/usr",
      "/Library/Developer/CommandLineTools/usr/bin",
      binary,
    ];
    try {
      if (
        paths.every((path) => {
          const stat = lstatSync(path);
          return (
            stat.uid === 0 &&
            (stat.mode & 0o022) === 0 &&
            (path === binary
              ? stat.isFile() && (stat.mode & 0o111) !== 0
              : stat.isDirectory())
          );
        })
      )
        return binary;
    } catch {
      // Xcode-only Macs or unavailable CLT retain the system launcher.
    }
  }
  return "/usr/bin/git";
}

/** HEAD and branch contain no newlines. Paths are deliberately not batched.
 * @param {string} repo @param {string} binary */
export function readGitIdentity(repo, binary = devOperationsGitExecutable()) {
  const lines = execFileSync(
    binary,
    [
      "--no-replace-objects",
      "--no-optional-locks",
      "-C",
      repo,
      "rev-parse",
      "HEAD",
      "--symbolic-full-name",
      "HEAD",
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  )
    .trimEnd()
    .split("\n");
  const [head, ref] = lines;
  if (
    lines.length !== 2 ||
    !head ||
    !/^[a-f0-9]{40}$/u.test(head) ||
    !ref ||
    (ref !== "HEAD" && !ref.startsWith("refs/heads/"))
  )
    throw new Error("invalid Git identity");
  return {
    head,
    branch: ref === "HEAD" ? "" : ref.slice("refs/heads/".length),
  };
}

/** Status resolves stat-only rewrites without refreshing the real index.
 * Keep the diff's original name multiplicity for unmerged paths, but filter
 * its stat-only false positives through the true worktree status column.
 * @param {(...args: string[]) => Buffer} git */
function unstagedSourceNames(git) {
  const raw = git(
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=no",
    "--no-renames",
    "--ignore-submodules=none",
  ).toString();
  if (raw !== "" && !raw.endsWith("\0"))
    throw new Error("invalid source status");
  const statuses = new Set([
    " M",
    " T",
    " D",
    " A",
    "M ",
    "MM",
    "MT",
    "MD",
    "T ",
    "TM",
    "TT",
    "TD",
    "A ",
    "AM",
    "AT",
    "AD",
    "D ",
    "DD",
    "AU",
    "UD",
    "UA",
    "DU",
    "AA",
    "UU",
    "??",
  ]);
  const seen = new Set();
  const unstaged = new Set();
  for (const record of raw === "" ? [] : raw.slice(0, -1).split("\0")) {
    const path = record.slice(3);
    if (
      record.length < 4 ||
      record[2] !== " " ||
      !statuses.has(record.slice(0, 2)) ||
      isAbsolute(path) ||
      path.split("/").some((part) => !part || part === "." || part === "..") ||
      seen.has(path)
    )
      throw new Error("invalid source status");
    seen.add(path);
    if (record[1] !== " " && record.slice(0, 2) !== "??") unstaged.add(path);
  }
  return git("diff", "--name-only", "--no-renames", "-z")
    .toString()
    .split("\0")
    .filter((path) => path !== "" && unstaged.has(path))
    .sort();
}

/** Observe Git-visible source only (not ignored dependencies or environment).
 * Repeated observations detect drift; this is not a filesystem lock or proof
 * against an adversarial writer restoring state between observations.
 * @param {string} repo */
export function captureSource(repo) {
  const binary = devOperationsGitExecutable();
  /** @param {...string} args */
  const git = (...args) =>
    execFileSync(
      binary,
      [
        "--no-replace-objects",
        "--no-optional-locks",
        "-c",
        "diff.autoRefreshIndex=false",
        "-C",
        repo,
        ...args,
      ],
      { maxBuffer: 16 * 1024 * 1024 },
    );
  if (
    realpathSync(git("rev-parse", "--show-toplevel").toString().trim()) !== repo
  )
    throw new Error("repo must be a Git worktree root");
  const { branch, head } = readGitIdentity(repo, binary);
  const inventory = git("ls-files", "--stage", "-z");
  const untracked = git("ls-files", "--others", "--exclude-standard", "-z")
    .toString()
    .split("\0")
    .filter(Boolean)
    .sort();
  const tracked = inventory
    .toString()
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const tab = record.indexOf("\t");
      if (tab < 0) throw new Error("invalid Git index inventory");
      return record.slice(tab + 1);
    });
  const paths = [...new Set([...tracked, ...untracked])].sort();
  const digest = createHash("sha256");
  const chunk = Buffer.alloc(64 * 1024);
  for (const path of paths) {
    if (
      isAbsolute(path) ||
      path.split("/").some((part) => !part || part === "." || part === "..")
    )
      throw new Error("unsafe source path");
    const source = resolve(repo, path);
    const before = lstatSync(source, { bigint: true, throwIfNoEntry: false });
    if (!before) {
      digest.update(JSON.stringify([path, "MISSING"]));
      continue;
    }
    if (!realpathSync(source).startsWith(repo + sep))
      throw new Error("source escapes repository");
    if (!before.isFile()) throw new Error("source must be a regular file");
    const fileHash = createHash("sha256");
    const fd = openSync(source, constants.O_RDONLY | constants.O_NOFOLLOW);
    let opened;
    try {
      let size;
      while ((size = readSync(fd, chunk, 0, chunk.length, null)) > 0)
        fileHash.update(chunk.subarray(0, size));
      opened = fstatSync(fd, { bigint: true });
    } finally {
      closeSync(fd);
    }
    const after = lstatSync(source, { bigint: true });
    /** @param {import("node:fs").BigIntStats} stat */
    const stamp = (stat) =>
      [
        stat.dev,
        stat.ino,
        stat.size,
        stat.mode,
        stat.mtimeNs,
        stat.ctimeNs,
      ].map(String);
    if (
      JSON.stringify(stamp(before)) !== JSON.stringify(stamp(after)) ||
      JSON.stringify(stamp(opened)) !== JSON.stringify(stamp(after))
    )
      throw new Error("source changed during capture");
    digest.update(JSON.stringify([path, fileHash.digest("hex"), stamp(after)]));
  }
  const index = resolve(
    repo,
    git("rev-parse", "--git-path", "index").toString().trim(),
  );
  const snapshot = {
    repo,
    branch,
    head,
    inventorySha256: sha256(inventory),
    indexSha256: existsSync(index) ? sha256(readFileSync(index)) : "MISSING",
    sourceSha256: digest.digest("hex"),
    stagedSha256: sha256(
      git(
        "diff",
        "--cached",
        "--binary",
        "--full-index",
        "--no-ext-diff",
        "--no-textconv",
        "--no-renames",
      ),
    ),
    unstagedSha256: sha256(
      git(
        "diff",
        "--binary",
        "--full-index",
        "--no-ext-diff",
        "--no-textconv",
        "--no-renames",
      ),
    ),
    untracked,
    stagedNames: git("diff", "--cached", "--name-only", "--no-renames", "-z")
      .toString()
      .split("\0")
      .filter(Boolean)
      .sort(),
    unstagedNames: unstagedSourceNames(git),
  };
  const finalIdentity = readGitIdentity(repo, binary);
  if (finalIdentity.head !== head || finalIdentity.branch !== branch)
    throw new Error("source changed during capture");
  return snapshot;
}

/** @param {ReturnType<typeof captureSource>} expected @param {ReturnType<typeof captureSource>} actual */
export function reconcileSource(expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual))
    throw new Error("source changed during capture or validation");
}

/** @param {string[]} argv */
function parse(argv) {
  /** @type {Map<string, string>} */
  const one = new Map();
  /** @type {string[]} */
  const allow = [];
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i],
      value = argv[i + 1];
    if (!key || !value) throw new Error("missing argument value");
    if (key === "--allow") allow.push(value);
    else if (
      ["--repo", "--out", "--expected-branch", "--expected-head"].includes(
        key,
      ) &&
      !one.has(key)
    )
      one.set(key, value);
    else throw new Error("unknown or duplicate argument");
  }
  if (one.size !== 4 || allow.length === 0)
    throw new Error(
      "repo, out, branch, HEAD and explicit allow paths required",
    );
  return { one, allow };
}

/** @param {string} path */
function safePath(path) {
  return (
    !isAbsolute(path) &&
    /^[A-Za-z0-9._/-]+$/u.test(path) &&
    !path
      .split("/")
      .some((part) => part === "" || part === "." || part === "..") &&
    !sensitiveName.test(path)
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  try {
    const { one, allow } = parse(process.argv.slice(2));
    const repo = realpathSync(resolve(one.get("--repo") ?? ""));
    const out = resolve(one.get("--out") ?? "");
    const outParent = realpathSync(dirname(out));
    if (
      out === repo ||
      out.startsWith(repo + sep) ||
      outParent === repo ||
      outParent.startsWith(repo + sep)
    )
      throw new Error("checkpoint must be outside repo");
    if (existsSync(out)) throw new Error("checkpoint target already exists");
    /** @param {...string} items */
    const git = (...items) =>
      execFileSync(
        devOperationsGitExecutable(),
        [
          "-C",
          repo,
          "--no-optional-locks",
          "-c",
          "diff.autoRefreshIndex=false",
          ...items,
        ],
        { maxBuffer: MAX_BYTES + 1024 },
      );
    if (
      realpathSync(git("rev-parse", "--show-toplevel").toString().trim()) !==
      repo
    )
      throw new Error("repo must be a Git worktree root");
    const branch = git("branch", "--show-current").toString().trim();
    const head = git("rev-parse", "HEAD").toString().trim();
    if (
      branch !== one.get("--expected-branch") ||
      head !== one.get("--expected-head")
    )
      throw new Error("branch or HEAD mismatch");
    const sourceBefore = captureSource(repo);
    if (sourceBefore.branch !== branch || sourceBefore.head !== head)
      throw new Error("source changed during capture");
    /** @param {Buffer} buffer */
    const names = (buffer) =>
      buffer.toString("utf8").split("\0").filter(Boolean);
    const stagedNames = names(
      git("diff", "--cached", "--name-only", "--no-renames", "-z"),
    ).sort();
    const unstagedNames = unstagedSourceNames(git);
    const untrackedNames = names(
      git("ls-files", "--others", "--exclude-standard", "-z"),
    );
    const changed = [
      ...new Set([...stagedNames, ...unstagedNames, ...untrackedNames]),
    ].sort();
    if (changed.length === 0) throw new Error("no dirty files to checkpoint");
    if (
      allow.some((path) => !safePath(path)) ||
      new Set(allow).size !== allow.length ||
      JSON.stringify([...allow].sort()) !== JSON.stringify(changed) ||
      changed.some((path) => !safePath(path))
    )
      throw new Error("changed paths must match exact non-sensitive allowlist");
    const staged = git(
      "diff",
      "--cached",
      "--binary",
      "--full-index",
      "--no-ext-diff",
      "--no-textconv",
      "--no-renames",
    );
    const unstaged = git(
      "diff",
      "--binary",
      "--full-index",
      "--no-ext-diff",
      "--no-textconv",
      "--no-renames",
    );
    if (
      staged.length > MAX_BYTES ||
      unstaged.length > MAX_BYTES ||
      sensitiveContent.test(staged.toString("utf8")) ||
      sensitiveContent.test(unstaged.toString("utf8"))
    )
      throw new Error(
        "diff exceeds size cap or matches sensitive-content guard",
      );
    /** @type {{path: string, bytes: Buffer, sha256: string}[]} */
    const files = [];
    for (const path of untrackedNames) {
      const source = resolve(repo, path);
      if (
        relative(repo, source).startsWith("..") ||
        !lstatSync(source).isFile()
      )
        throw new Error("untracked item must be a regular file inside repo");
      const bytes = readFileSync(source);
      if (
        bytes.length > MAX_BYTES ||
        sensitiveContent.test(bytes.toString("utf8"))
      )
        throw new Error(
          "untracked file exceeds size cap or matches sensitive-content guard",
        );
      files.push({ path, bytes, sha256: sha256(bytes) });
    }
    reconcileSource(sourceBefore, captureSource(repo));
    if (
      sourceBefore.stagedSha256 !== sha256(staged) ||
      sourceBefore.unstagedSha256 !== sha256(unstaged) ||
      JSON.stringify(sourceBefore.stagedNames) !==
        JSON.stringify(stagedNames) ||
      JSON.stringify(sourceBefore.unstagedNames) !==
        JSON.stringify(unstagedNames) ||
      JSON.stringify(sourceBefore.untracked) !==
        JSON.stringify([...untrackedNames].sort())
    )
      throw new Error("checkpoint payload differs from source snapshot");
    // Re-read captured untracked bytes as well; digest-only source reconciliation
    // cannot substitute for proving that the copied payload is the same state.
    for (const file of files)
      if (sha256(readFileSync(resolve(repo, file.path))) !== file.sha256)
        throw new Error("checkpoint payload changed during capture");
    reconcileSource(sourceBefore, captureSource(repo));
    mkdirSync(out, { mode: 0o700 });
    /** @param {string} path @param {string | Buffer} bytes */
    const write = (path, bytes) =>
      writeFileSync(resolve(out, path), bytes, { mode: 0o600, flag: "wx" });
    write("staged.patch", staged);
    write("unstaged.patch", unstaged);
    for (const file of files) {
      const target = resolve(out, "untracked", file.path);
      mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, file.bytes, { mode: 0o600, flag: "wx" });
    }
    const manifest = {
      version: 2,
      source: sourceBefore,
      branch,
      head,
      changedPaths: changed,
      stagedNames,
      unstagedNames,
      untrackedNames,
      stagedSha256: sha256(staged),
      unstagedSha256: sha256(unstaged),
      untracked: files.map(({ path, sha256 }) => ({ path, sha256 })),
    };
    // No manifest or PASS is published if a writer changed source while copying.
    // Partial output is retained for diagnosis, never treated as a checkpoint.
    reconcileSource(sourceBefore, captureSource(repo));
    write(
      "manifest.json",
      Buffer.from(JSON.stringify(manifest, null, 2) + "\n"),
    );
    console.log(
      JSON.stringify({
        status: "PASS",
        checkpoint: out,
        head,
        staged: stagedNames.length,
        unstaged: unstagedNames.length,
        untracked: files.length,
        stagedSha256: manifest.stagedSha256,
        unstagedSha256: manifest.unstagedSha256,
      }),
    );
  } catch (error) {
    console.error(
      `CHECKPOINT_BLOCKED: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  }
