import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTask } from "./create-task.js";
import { getTask } from "./get-task.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-get-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("getTask", () => {
  it("returns null for missing id", async () => {
    expect(await getTask("sess", "1", root)).toBeNull();
  });

  it("returns the task when present", async () => {
    const id = await createTask("sess", { subject: "x", description: "y" }, root);
    const t = await getTask("sess", id, root);
    expect(t).toEqual({ id, subject: "x", description: "y", status: "pending" });
  });

  it("returns null for malformed file (graceful)", async () => {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { dirname } = await import("node:path");
    const { getTaskPath } = await import("../common/paths.js");
    const path = getTaskPath("sess", "9", root);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, "not-json");
    expect(await getTask("sess", "9", root)).toBeNull();
  });
});
