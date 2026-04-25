import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTaskPath } from "../common/paths.js";
import { createTask } from "./create-task.js";
import { cloneTaskList } from "./fork.js";
import { updateTask } from "./update-task.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-fork-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("cloneTaskList", () => {
  it("creates a deep copy of the parent dir under the child id", async () => {
    await createTask("parent", { subject: "x", description: "y" }, root);
    await cloneTaskList("parent", "child", root);
    expect(existsSync(getTaskPath("child", "1", root))).toBe(true);
  });

  it("post-clone mutations to parent do not affect child", async () => {
    await createTask("parent", { subject: "x", description: "y" }, root);
    await cloneTaskList("parent", "child", root);
    await updateTask("parent", "1", { subject: "PARENT-EDIT" }, root);
    const childData = JSON.parse(readFileSync(getTaskPath("child", "1", root), "utf-8"));
    expect(childData.subject).toBe("x");
  });

  it("noop when parent dir does not exist", async () => {
    await expect(cloneTaskList("nope", "child", root)).resolves.toBeUndefined();
    expect(existsSync(join(root, "child"))).toBe(false);
  });
});
