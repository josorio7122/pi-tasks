import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureTaskListLockFile, ensureTasksDir, LOCK_OPTIONS } from "./locking.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-locking-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("ensureTasksDir", () => {
  it("creates the dir if missing", async () => {
    await ensureTasksDir("sess-1", root);
    expect(statSync(join(root, "sess-1")).isDirectory()).toBe(true);
  });

  it("idempotent if dir already exists", async () => {
    await ensureTasksDir("sess-1", root);
    await ensureTasksDir("sess-1", root);
    expect(statSync(join(root, "sess-1")).isDirectory()).toBe(true);
  });
});

describe("ensureTaskListLockFile", () => {
  it("creates an empty .lock file under the task dir", async () => {
    const path = await ensureTaskListLockFile("sess-1", root);
    expect(path).toBe(join(root, "sess-1", ".lock"));
    expect(readFileSync(path, "utf-8")).toBe("");
  });

  it("does not error if the lock file already exists", async () => {
    await ensureTaskListLockFile("sess-1", root);
    await expect(ensureTaskListLockFile("sess-1", root)).resolves.toBeTypeOf("string");
  });
});

describe("LOCK_OPTIONS", () => {
  it("retries 30 times with 5..100ms backoff (V2 verbatim)", () => {
    expect(LOCK_OPTIONS.retries.retries).toBe(30);
    expect(LOCK_OPTIONS.retries.minTimeout).toBe(5);
    expect(LOCK_OPTIONS.retries.maxTimeout).toBe(100);
  });
});
