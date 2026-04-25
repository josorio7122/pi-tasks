import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTask } from "./create-task.js";
import { readHighWaterMark } from "./hwm.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-create-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("createTask", () => {
  it("returns id '1' for first task", async () => {
    const id = await createTask("sess", { subject: "x", description: "y" }, root);
    expect(id).toBe("1");
  });

  it("writes the task JSON with status: pending", async () => {
    const id = await createTask("sess", { subject: "Build login", description: "wire it" }, root);
    const path = join(root, "sess", `${id}.json`);
    const data = JSON.parse(readFileSync(path, "utf-8"));
    expect(data).toEqual({
      id: "1",
      subject: "Build login",
      description: "wire it",
      status: "pending",
    });
  });

  it("preserves activeForm when provided", async () => {
    const id = await createTask(
      "sess",
      { subject: "Run tests", description: "pytest", activeForm: "Running tests" },
      root,
    );
    const data = JSON.parse(readFileSync(join(root, "sess", `${id}.json`), "utf-8"));
    expect(data.activeForm).toBe("Running tests");
  });

  it("ignores any rogue status hint and forces pending", async () => {
    const id = await createTask("sess", { subject: "x", description: "y", status: "completed" } as never, root);
    const data = JSON.parse(readFileSync(join(root, "sess", `${id}.json`), "utf-8"));
    expect(data.status).toBe("pending");
  });

  it("monotonically increments id per call", async () => {
    const a = await createTask("sess", { subject: "a", description: "a" }, root);
    const b = await createTask("sess", { subject: "b", description: "b" }, root);
    const c = await createTask("sess", { subject: "c", description: "c" }, root);
    expect([a, b, c]).toEqual(["1", "2", "3"]);
  });

  it("bumps hwm so deleted ids never recycle", async () => {
    await createTask("sess", { subject: "a", description: "a" }, root);
    await createTask("sess", { subject: "b", description: "b" }, root);
    expect(await readHighWaterMark("sess", root)).toBe(2);
  });

  it("serializes parallel creates correctly under lock", async () => {
    const ids = await Promise.all(
      Array.from({ length: 8 }, (_, i) => createTask("sess", { subject: `t${i}`, description: `d${i}` }, root)),
    );
    expect(new Set(ids).size).toBe(8);
    expect(ids.map((s) => Number.parseInt(s, 10)).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
