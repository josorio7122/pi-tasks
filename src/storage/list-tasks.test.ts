import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTask } from "./create-task.js";
import { listTasks } from "./list-tasks.js";
import { ensureTasksDir } from "./locking.js";

let root: string;

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-list-"));
  await ensureTasksDir("sess", root);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("listTasks", () => {
  it("returns [] for empty dir", async () => {
    expect(await listTasks("sess", root)).toEqual([]);
  });

  it("returns tasks sorted ascending by numeric id", async () => {
    await createTask("sess", { subject: "a", description: "a" }, root);
    await createTask("sess", { subject: "b", description: "b" }, root);
    await createTask("sess", { subject: "c", description: "c" }, root);
    const t = await listTasks("sess", root);
    expect(t.map((x) => x.id)).toEqual(["1", "2", "3"]);
    expect(t.map((x) => x.subject)).toEqual(["a", "b", "c"]);
  });

  it("ignores non-json and malformed files", async () => {
    await createTask("sess", { subject: "ok", description: "ok" }, root);
    writeFileSync(join(root, "sess", "garbage.txt"), "not a task");
    writeFileSync(join(root, "sess", "9.json"), "not-json");
    const t = await listTasks("sess", root);
    expect(t).toHaveLength(1);
    expect(t[0]?.subject).toBe("ok");
  });
});
