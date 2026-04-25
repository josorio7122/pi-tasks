import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTaskPath } from "../common/paths.js";
import { createTask } from "./create-task.js";
import { getTask } from "./get-task.js";
import { updateTask } from "./update-task.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-update-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("updateTask", () => {
  it("returns success: false 'Task not found' when id does not exist", async () => {
    const r = await updateTask("sess", "missing", { status: "in_progress" }, root);
    expect(r.success).toBe(false);
    expect(r.error).toBe("Task not found");
    expect(r.updatedFields).toEqual([]);
  });

  it("merges status change and reports updatedFields", async () => {
    const id = await createTask("sess", { subject: "x", description: "y" }, root);
    const r = await updateTask("sess", id, { status: "in_progress" }, root);
    expect(r.success).toBe(true);
    expect(r.updatedFields).toEqual(["status"]);
    expect(r.statusChange).toEqual({ from: "pending", to: "in_progress" });
    expect((await getTask("sess", id, root))?.status).toBe("in_progress");
  });

  it("stamps startedAt when status flips to in_progress", async () => {
    const id = await createTask("sess", { subject: "x", description: "y" }, root);
    const before = Date.now();
    await updateTask("sess", id, { status: "in_progress" }, root);
    const t = await getTask("sess", id, root);
    expect(t?.startedAt).toBeGreaterThanOrEqual(before);
  });

  it("strips startedAt when leaving in_progress", async () => {
    const id = await createTask("sess", { subject: "x", description: "y" }, root);
    await updateTask("sess", id, { status: "in_progress" }, root);
    await updateTask("sess", id, { status: "completed" }, root);
    expect((await getTask("sess", id, root))?.startedAt).toBeUndefined();
  });

  it("skips no-op writes (no updatedFields when nothing differs)", async () => {
    const id = await createTask("sess", { subject: "x", description: "y" }, root);
    const r = await updateTask("sess", id, { subject: "x", description: "y" }, root);
    expect(r.success).toBe(true);
    expect(r.updatedFields).toEqual([]);
    expect(r.statusChange).toBeUndefined();
  });

  it("status: deleted removes the task file and reports statusChange.to=deleted", async () => {
    const id = await createTask("sess", { subject: "x", description: "y" }, root);
    const r = await updateTask("sess", id, { status: "deleted" }, root);
    expect(r.success).toBe(true);
    expect(r.updatedFields).toEqual(["deleted"]);
    expect(r.statusChange).toEqual({ from: "pending", to: "deleted" });
    expect(existsSync(getTaskPath("sess", id, root))).toBe(false);
  });

  it("partial field updates merge correctly", async () => {
    const id = await createTask("sess", { subject: "x", description: "y" }, root);
    await updateTask("sess", id, { subject: "new subject", activeForm: "Doing new thing" }, root);
    const t = await getTask("sess", id, root);
    expect(t?.subject).toBe("new subject");
    expect(t?.activeForm).toBe("Doing new thing");
    expect(t?.description).toBe("y");
  });
});
