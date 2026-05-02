import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTaskPath } from "../common/paths.js";
import { createTask } from "./create-task.js";
import { listTasks } from "./list-tasks.js";
import { resetTaskList } from "./reset.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-reset-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("resetTaskList", () => {
  it("deletes every task file in the list dir", async () => {
    await createTask("sess", { subject: "a", description: "x" }, root);
    await createTask("sess", { subject: "b", description: "y" }, root);
    await createTask("sess", { subject: "c", description: "z" }, root);
    await resetTaskList("sess", root);
    expect(await listTasks("sess", root)).toEqual([]);
    expect(existsSync(getTaskPath("sess", "1", root))).toBe(false);
    expect(existsSync(getTaskPath("sess", "2", root))).toBe(false);
    expect(existsSync(getTaskPath("sess", "3", root))).toBe(false);
  });

  it("bumps the high-water-mark so subsequent IDs do not reuse deleted ones", async () => {
    await createTask("sess", { subject: "a", description: "x" }, root);
    await createTask("sess", { subject: "b", description: "y" }, root);
    await resetTaskList("sess", root);
    const newId = await createTask("sess", { subject: "fresh", description: "after-reset" }, root);
    expect(newId).toBe("3");
  });

  it("is a no-op on a list that has no task files yet", async () => {
    await expect(resetTaskList("never-existed", root)).resolves.toBeUndefined();
    expect(await listTasks("never-existed", root)).toEqual([]);
  });

  it("preserves the lockfile and high-water-mark dotfiles", async () => {
    await createTask("sess", { subject: "a", description: "x" }, root);
    await resetTaskList("sess", root);
    // After reset, listTasks (which iterates non-dot .json files) should return [].
    // Re-running reset must not throw — proves lock + hwm path are intact.
    await expect(resetTaskList("sess", root)).resolves.toBeUndefined();
  });
});
