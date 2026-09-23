// @ts-check
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const MAX_BYTES = 5 * 1024 * 1024;
const sensitiveName =
  /(^|\/)(?:\.env(?:\.|$)|.*(?:secret|token|credential|private.?key|customer|raw.?chat|slip).*)/iu;
const sensitiveContent =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{12,}\b|\bBearer\s+[A-Za-z0-9._-]{12,}\b/iu;
/** @param {string | Buffer} value */
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

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
      "/usr/bin/git",
      ["-C", repo, "--no-optional-locks", ...items],
      { maxBuffer: MAX_BYTES + 1024 },
    );
  if (
    realpathSync(git("rev-parse", "--show-toplevel").toString().trim()) !== repo
  )
    throw new Error("repo must be a Git worktree root");
  const branch = git("branch", "--show-current").toString().trim();
  const head = git("rev-parse", "HEAD").toString().trim();
  if (
    branch !== one.get("--expected-branch") ||
    head !== one.get("--expected-head")
  )
    throw new Error("branch or HEAD mismatch");
  /** @param {Buffer} buffer */
  const names = (buffer) => buffer.toString("utf8").split("\0").filter(Boolean);
  const stagedNames = names(git("diff", "--cached", "--name-only", "-z"));
  const unstagedNames = names(git("diff", "--name-only", "-z"));
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
  const staged = git("diff", "--cached", "--binary", "--no-ext-diff");
  const unstaged = git("diff", "--binary", "--no-ext-diff");
  if (
    staged.length > MAX_BYTES ||
    unstaged.length > MAX_BYTES ||
    sensitiveContent.test(staged.toString("utf8")) ||
    sensitiveContent.test(unstaged.toString("utf8"))
  )
    throw new Error("diff exceeds size cap or matches sensitive-content guard");
  /** @type {{path: string, bytes: Buffer, sha256: string}[]} */
  const files = [];
  for (const path of untrackedNames) {
    const source = resolve(repo, path);
    if (relative(repo, source).startsWith("..") || !lstatSync(source).isFile())
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
    version: 1,
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
  write("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2) + "\n"));
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
