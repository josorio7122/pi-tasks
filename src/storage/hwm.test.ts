import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findHighestTaskId, readHighWaterMark, writeHighWaterMark } from "./hwm.js";
import { ensureTasksDir } from "./locking.js";

let root: string;

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-hwm-"));
  await ensureTasksDir("sess", root);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("readHighWaterMark", () => {
  it("returns 0 when no file", async () => {
    expect(await readHighWaterMark("sess", root)).toBe(0);
  });

  it("returns the parsed integer", async () => {
    writeFileSync(join(root, "sess", ".highwatermark"), "  42 \n");
    expect(await readHighWaterMark("sess", root)).toBe(42);
  });

  it("returns 0 for unparseable contents", async () => {
    writeFileSync(join(root, "sess", ".highwatermark"), "garbage");
    expect(await readHighWaterMark("sess", root)).toBe(0);
  });
});

describe("writeHighWaterMark", () => {
  it("writes the integer as text", async () => {
    await writeHighWaterMark("sess", 7, root);
    expect(await readHighWaterMark("sess", root)).toBe(7);
  });
});

describe("findHighestTaskId", () => {
  it("returns 0 when dir empty", async () => {
    expect(await findHighestTaskId("sess", root)).toBe(0);
  });

  it("scans <id>.json files", async () => {
    writeFileSync(join(root, "sess", "1.json"), "{}");
    writeFileSync(join(root, "sess", "5.json"), "{}");
    writeFileSync(join(root, "sess", "3.json"), "{}");
    writeFileSync(join(root, "sess", "junk.json"), "{}");
    expect(await findHighestTaskId("sess", root)).toBe(5);
  });

  it("respects hwm even when files were deleted", async () => {
    writeFileSync(join(root, "sess", "1.json"), "{}");
    await writeHighWaterMark("sess", 99, root);
    expect(await findHighestTaskId("sess", root)).toBe(99);
  });
});
