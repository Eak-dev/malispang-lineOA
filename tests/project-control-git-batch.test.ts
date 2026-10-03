import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { projectControlGitExecutable } from "../src/project-control.js";
import {
  GIT_BLOB_LIMIT,
  readGitBlobBatch,
} from "../src/project-control-git-batch.js";

const revision = "1".repeat(40);
const spec = `${revision}:fixture.txt`;
const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const objectOid = (bytes: Buffer, type = "blob") =>
  createHash("sha1")
    .update(`${type} ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
const frame = (bytes: Buffer, type = "blob") =>
  Buffer.concat([
    Buffer.from(`${objectOid(bytes, type)} ${type} ${bytes.length}\n`),
    bytes,
    Buffer.from("\n"),
  ]);

const gitArgs = [
  "--no-optional-locks",
  "--no-replace-objects",
  "-c",
  "core.fsmonitor=false",
  "-c",
  "core.abbrev=7",
  "-c",
  "diff.algorithm=myers",
  "-c",
  "core.hooksPath=/dev/null",
  "-c",
  "core.autocrlf=false",
  "-c",
  "commit.gpgsign=false",
  "-c",
  "user.name=MP06 Synthetic",
  "-c",
  "user.email=synthetic@example.invalid",
];
const gitEnv = {
  PATH: "/usr/bin:/bin",
  LANG: "C",
  LC_ALL: "C",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_TERMINAL_PROMPT: "0",
};

async function withRepository(
  run: (fixture: {
    cwd: string;
    first: string;
    second: string;
    git: (args: string[], input?: string, maxBuffer?: number) => Buffer;
  }) => void,
) {
  const cwd = await mkdtemp(join(tmpdir(), "mp06-git-batch-"));
  const git = (args: string[], input?: string, maxBuffer = GIT_BLOB_LIMIT) =>
    execFileSync(projectControlGitExecutable(), [...gitArgs, ...args], {
      cwd,
      env: gitEnv,
      input,
      maxBuffer,
      stdio: ["pipe", "pipe", "pipe"],
    });
  try {
    git(["init", "--quiet", "--object-format=sha1"]);
    await mkdir(join(cwd, "nested"));
    for (const [path, bytes] of [
      ["plain.txt", Buffer.from("first\n")],
      ["empty.txt", Buffer.alloc(0)],
      ["utf8.txt", Buffer.from("\ufeffมะลิปัง 😀\r\n")],
      ["binary.dat", Buffer.from([0, 0xff, 0xc3, 0x28, 10, 13, 0xe2, 0x82])],
      ["without-newline.txt", Buffer.from("last byte")],
      ["nested/file.txt", Buffer.from(`${"a".repeat(40)} blob 2\nxx\n`)],
    ] as const)
      await writeFile(join(cwd, path), bytes);
    await symlink("plain.txt", join(cwd, "link.txt"));
    git(["add", "--all"]);
    git(["commit", "--quiet", "-m", "synthetic first"]);
    const first = git(["rev-parse", "HEAD"]).toString("utf8").trim();
    await writeFile(join(cwd, "plain.txt"), "second\n");
    git(["add", "plain.txt"]);
    git(["commit", "--quiet", "-m", "synthetic second"]);
    const second = git(["rev-parse", "HEAD"]).toString("utf8").trim();
    run({ cwd, first, second, git });
  } finally {
    await rm(cwd, { recursive: true, force: true });
    expect(existsSync(cwd)).toBe(false);
  }
}

describe("immutable Git blob batch contract", () => {
  it("matches real git-show UTF-8 text, hashes and OIDs across revisions, duplicates and chunks", async () => {
    await withRepository(({ cwd, first, second, git }) => {
      const specs = [
        `${first}:plain.txt`,
        `${second}:plain.txt`,
        `${first}:empty.txt`,
        `${first}:utf8.txt`,
        `${first}:binary.dat`,
        `${first}:without-newline.txt`,
        `${first}:nested/file.txt`,
        `${first}:link.txt`,
        `${first}:plain.txt`,
      ];
      const transport = vi.fn((input: string, limit: number) =>
        git(["cat-file", "--batch"], input, limit),
      );
      const blobs = readGitBlobBatch(specs, transport);
      expect(blobs).toHaveLength(specs.length);
      expect(transport.mock.calls.length).toBeGreaterThan(1);
      expect(transport.mock.calls.map(([input]) => input).join("")).toBe(
        specs.join("\n") + "\n",
      );
      for (const [index, request] of specs.entries()) {
        const legacy = execFileSync(
          projectControlGitExecutable(),
          [...gitArgs, "show", request],
          { cwd, env: gitEnv, encoding: "utf8", maxBuffer: GIT_BLOB_LIMIT },
        );
        expect(blobs[index]!.text()).toBe(legacy);
        expect(sha256(blobs[index]!.text())).toBe(sha256(legacy));
        expect(blobs[index]!.oid()).toBe(
          git(["rev-parse", request]).toString("utf8").trim(),
        );
      }
      expect(blobs[4]!.text()).toContain("\ufffd");
      expect(sha256(blobs[4]!.text())).not.toBe(
        sha256(git(["show", specs[4]!])),
      );
      expect(Object.isFrozen(blobs)).toBe(true);
      expect(blobs.every(Object.isFrozen)).toBe(true);
    });
  });

  it("defers real missing, tree and gitlink failures until access without losing adjacent blobs", async () => {
    await withRepository(({ first, git }) => {
      git(["update-index", "--add", "--cacheinfo", `160000,${first},module`]);
      git(["commit", "--quiet", "-m", "synthetic gitlink"]);
      const head = git(["rev-parse", "HEAD"]).toString("utf8").trim();
      const specs = [
        `${first}:plain.txt`,
        `${first}:absent.txt`,
        `${"0".repeat(40)}:plain.txt`,
        `${first}:nested`,
        `${head}:module`,
        `${head}:plain.txt`,
      ];
      const blobs = readGitBlobBatch(specs, (input, limit) =>
        git(["cat-file", "--batch"], input, limit),
      );
      expect(blobs[0]!.text()).toBe("first\n");
      expect(blobs[5]!.text()).toBe("second\n");
      for (const index of [1, 2, 3, 4]) {
        expect(() => blobs[index]!.text()).toThrow(
          "GIT_BATCH_BLOB_UNAVAILABLE",
        );
        expect(() => blobs[index]!.oid()).toThrow("GIT_BATCH_BLOB_UNAVAILABLE");
      }
    });
  });

  it("ignores replacement refs, reads symlink blobs and preserves HEAD, index bytes and worktree", async () => {
    await withRepository(({ cwd, first, second, git }) => {
      const original = git(["rev-parse", `${first}:plain.txt`])
        .toString("utf8")
        .trim();
      const replacement = git(["rev-parse", `${second}:plain.txt`])
        .toString("utf8")
        .trim();
      git(["replace", original, replacement]);
      const index = join(cwd, ".git", "index");
      const before = {
        head: git(["rev-parse", "HEAD"]),
        index: readFileSync(index),
        file: readFileSync(join(cwd, "plain.txt")),
        status: git(["status", "--porcelain=v1", "-z"]),
      };
      expect(existsSync(index + ".lock")).toBe(false);
      const blobs = readGitBlobBatch(
        [`${first}:plain.txt`, `${first}:link.txt`],
        (input, limit) => git(["cat-file", "--batch"], input, limit),
      );
      expect(blobs[0]!.text()).toBe("first\n");
      expect(blobs[0]!.oid()).toBe(original);
      expect(blobs[1]!.text()).toBe("plain.txt");
      expect(git(["rev-parse", "HEAD"])).toEqual(before.head);
      expect(readFileSync(index)).toEqual(before.index);
      expect(readFileSync(join(cwd, "plain.txt"))).toEqual(before.file);
      expect(git(["status", "--porcelain=v1", "-z"])).toEqual(before.status);
      expect(existsSync(index + ".lock")).toBe(false);
    });
  });

  it("rejects mutable refs, revision syntax, path aliases and framing injection before transport", () => {
    const transport = vi.fn(() => Buffer.alloc(0));
    for (const invalid of [
      "HEAD:fixture.txt",
      "main:fixture.txt",
      "1111111:fixture.txt",
      `${revision}^:fixture.txt`,
      ":fixture.txt",
      `${revision}:`,
      `${revision}:/fixture.txt`,
      `${revision}:./fixture.txt`,
      `${revision}:../fixture.txt`,
      `${revision}:dir/../fixture.txt`,
      `${revision}:dir//fixture.txt`,
      `${revision}:fixture.txt/`,
      `${revision}:fixture.txt\n${spec}`,
      `${revision}:fixture.txt\n`,
      `${revision}:fixture.txt\r`,
      `${revision}:fixture.txt\u2028`,
      `${revision}:fixture.txt\u2029`,
      `${revision}:fixture.txt\0`,
      `${revision}:fixture.txt rest`,
      `${revision}:dir\\fixture.txt`,
      `${revision}:*.txt`,
      `${revision}:${"a".repeat(4096)}`,
    ])
      expect(
        () => readGitBlobBatch([spec, invalid], transport),
        invalid,
      ).toThrow("GIT_BATCH_SPEC_INVALID");
    expect(transport).not.toHaveBeenCalled();
  });

  it("frames byte lengths independently of decoded UTF-8, embedded delimiters and empty bodies", () => {
    const bodies = [
      Buffer.alloc(0),
      Buffer.from("มะลิปัง 😀\r\n\0"),
      Buffer.from(`${"a".repeat(40)} blob 0\n\n${spec} missing\n`),
      Buffer.from([0xe2, 0x82]),
      Buffer.from([0xac, 0xff, 0]),
      Buffer.from("no final newline"),
    ];
    const blobs = readGitBlobBatch(
      bodies.map((_, index) => `${revision}:body-${index}`),
      () => Buffer.concat(bodies.map((bytes) => frame(bytes))),
    );
    for (const [index, body] of bodies.entries()) {
      expect(blobs[index]!.text()).toBe(body.toString("utf8"));
      expect(blobs[index]!.oid()).toBe(objectOid(body));
    }
    expect(blobs[3]!.text() + blobs[4]!.text()).not.toBe(
      Buffer.concat([bodies[3]!, bodies[4]!]).toString("utf8"),
    );
  });

  it("rejects malformed, non-ASCII and overlong headers", () => {
    for (const header of [
      `${"a".repeat(39)} blob 0`,
      `${"A".repeat(40)} blob 0`,
      `${"g".repeat(40)} blob 0`,
      `${"a".repeat(40)} unknown 0`,
      `${"a".repeat(40)} blob -1`,
      `${"a".repeat(40)} blob 1.5`,
      `${"a".repeat(40)} blob 01`,
      `${"a".repeat(40)} blob +1`,
      `${"a".repeat(40)}  blob 0`,
      `${"a".repeat(40)} blob 0 extra`,
      `${"a".repeat(40)} blob 0\r`,
      "a".repeat(8193),
    ])
      expect(() =>
        readGitBlobBatch([spec], () => Buffer.from(header + "\n\n")),
      ).toThrow("GIT_BATCH_HEADER_INVALID");
    const nonAscii = frame(Buffer.alloc(0));
    nonAscii[0] = nonAscii[0]! | 0x80;
    expect(() => readGitBlobBatch([spec], () => nonAscii)).toThrow(
      "GIT_BATCH_HEADER_INVALID",
    );
    expect(() =>
      readGitBlobBatch([spec], () => Buffer.from("no newline")),
    ).toThrow("GIT_BATCH_HEADER_INVALID");
  });

  it("rejects truncated bodies, bad separators, wrong OIDs and missing or additional responses", () => {
    const valid = frame(Buffer.from("abc"));
    for (const malformed of [
      valid.subarray(0, valid.length - 1),
      valid.subarray(0, valid.length - 2),
      Buffer.concat([valid.subarray(0, valid.length - 1), Buffer.from("x")]),
    ])
      expect(() => readGitBlobBatch([spec], () => malformed)).toThrow(
        "GIT_BATCH_BODY_INVALID",
      );
    const wrongOid = Buffer.from(valid);
    wrongOid[0] = wrongOid[0] === 97 ? 98 : 97;
    expect(() => readGitBlobBatch([spec], () => wrongOid)).toThrow(
      "GIT_BATCH_OID_MISMATCH",
    );
    expect(() => readGitBlobBatch([spec, spec], () => valid)).toThrow(
      "GIT_BATCH_HEADER_INVALID",
    );
    for (const extra of [Buffer.from("\n"), valid])
      expect(() =>
        readGitBlobBatch([spec], () => Buffer.concat([valid, extra])),
      ).toThrow("GIT_BATCH_TRAILING_OUTPUT");
  });

  it("requires missing responses to match the exact requested slot and rejects other status lines", () => {
    const other = `${revision}:other.txt`;
    const blobs = readGitBlobBatch([spec, other], () =>
      Buffer.concat([
        Buffer.from(`${spec} missing\n`),
        frame(Buffer.from("available")),
      ]),
    );
    expect(blobs[1]!.text()).toBe("available");
    expect(() => blobs[0]!.text()).toThrow("GIT_BATCH_BLOB_UNAVAILABLE");
    for (const status of [
      `${other} missing`,
      `${spec} ambiguous`,
      `${spec} filtered`,
      "dangling 3",
    ])
      expect(() =>
        readGitBlobBatch([spec], () => Buffer.from(status + "\n")),
      ).toThrow("GIT_BATCH_HEADER_INVALID");
  });

  it("reads fresh on each invocation, propagates transport failures and does no work for an empty request", () => {
    const transport = vi
      .fn()
      .mockReturnValueOnce(frame(Buffer.from("first")))
      .mockReturnValueOnce(frame(Buffer.from("fresh")));
    expect(readGitBlobBatch([spec], transport)[0]!.text()).toBe("first");
    expect(readGitBlobBatch([spec], transport)[0]!.text()).toBe("fresh");
    expect(transport).toHaveBeenCalledTimes(2);
    const failure = new Error("synthetic Git exit or maxBuffer failure");
    const broken = vi.fn((): Buffer => {
      throw failure;
    });
    expect(() => readGitBlobBatch([spec], broken)).toThrow(failure);
    const unused = vi.fn(() => Buffer.alloc(0));
    expect(readGitBlobBatch([], unused)).toEqual([]);
    expect(unused).not.toHaveBeenCalled();
  });

  it("preserves the per-blob size boundary while bounding total transport output and unsafe sizes", () => {
    const boundary = Buffer.alloc(GIT_BLOB_LIMIT, 97);
    const transport = vi.fn(() =>
      Buffer.concat([frame(boundary), frame(Buffer.from("next"))]),
    );
    const blobs = readGitBlobBatch([spec, `${revision}:next.txt`], transport);
    expect(blobs[0]!.text().length).toBe(GIT_BLOB_LIMIT);
    expect(blobs[0]!.oid()).toBe(objectOid(boundary));
    expect(blobs[1]!.text()).toBe("next");
    for (const size of [GIT_BLOB_LIMIT + 1, Number.MAX_SAFE_INTEGER + 1])
      expect(() =>
        readGitBlobBatch([spec], () =>
          Buffer.from(`${"a".repeat(40)} blob ${size}\n`),
        ),
      ).toThrow("GIT_BATCH_OBJECT_LIMIT");
    expect(() =>
      readGitBlobBatch([spec], (_input, limit) => Buffer.alloc(limit + 1)),
    ).toThrow("GIT_BATCH_OUTPUT_LIMIT");
  });
});
