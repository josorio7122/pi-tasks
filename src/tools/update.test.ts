import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTask, updateTask } from "../storage/index.js";
import { mockTheme } from "../test/mock-theme.js";
import { buildTaskUpdateTool } from "./update.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-tool-update-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function ctx(): ExtensionContext {
  return {
    sessionManager: { getSessionId: () => "sess", getEntries: () => [], appendCustomEntry: vi.fn() } as never,
    ui: { theme: mockTheme(), setWidget: vi.fn() },
  } as unknown as ExtensionContext;
}

describe("task_update tool", () => {
  it("returns 'Updated task #<id> <fields>' on success", async () => {
    const tool = buildTaskUpdateTool({ tasksRoot: root, inheritedTaskListId: false });
    const id = await createTask("sess", { subject: "x", description: "y" }, root);
    const r = await tool.execute(
      "tu1",
      { taskId: id, status: "in_progress" },
      new AbortController().signal,
      undefined,
      ctx(),
    );
    const text = r.content[0]?.type === "text" ? r.content[0].text : "";
    expect(text).toBe(`Updated task #${id} status`);
  });

  it("returns 'Task not found' for missing id (benign)", async () => {
    const tool = buildTaskUpdateTool({ tasksRoot: root, inheritedTaskListId: false });
    const r = await tool.execute(
      "tu2",
      { taskId: "999", status: "in_progress" },
      new AbortController().signal,
      undefined,
      ctx(),
    );
    expect(r.content[0]?.type === "text" ? r.content[0].text : "").toBe("Task not found");
  });

  it("returns 'Updated task #<id> deleted' on status: deleted", async () => {
    const tool = buildTaskUpdateTool({ tasksRoot: root, inheritedTaskListId: false });
    const id = await createTask("sess", { subject: "x", description: "y" }, root);
    const r = await tool.execute(
      "tu3",
      { taskId: id, status: "deleted" },
      new AbortController().signal,
      undefined,
      ctx(),
    );
    expect(r.content[0]?.type === "text" ? r.content[0].text : "").toBe(`Updated task #${id} deleted`);
  });

  it("appends verification nudge when 3+ tasks all completed without 'verif' subject", async () => {
    const tool = buildTaskUpdateTool({ tasksRoot: root, inheritedTaskListId: false });
    const a = await createTask("sess", { subject: "alpha", description: "a" }, root);
    const b = await createTask("sess", { subject: "beta", description: "b" }, root);
    const c = await createTask("sess", { subject: "gamma", description: "c" }, root);
    await updateTask("sess", a, { status: "completed" }, root);
    await updateTask("sess", b, { status: "completed" }, root);

    const r = await tool.execute(
      "tu4",
      { taskId: c, status: "completed" },
      new AbortController().signal,
      undefined,
      ctx(),
    );
    const text = r.content[0]?.type === "text" ? r.content[0].text : "";
    expect(text).toContain(`Updated task #${c} status`);
    expect(text).toContain("NOTE: You just closed out 3+ tasks");
    expect(text).toContain('subagent(agent: "verifier"');
  });

  it("does NOT append nudge when running in subagent (inherited)", async () => {
    const tool = buildTaskUpdateTool({ tasksRoot: root, inheritedTaskListId: true });
    const a = await createTask("sess", { subject: "alpha", description: "a" }, root);
    const b = await createTask("sess", { subject: "beta", description: "b" }, root);
    const c = await createTask("sess", { subject: "gamma", description: "c" }, root);
    await updateTask("sess", a, { status: "completed" }, root);
    await updateTask("sess", b, { status: "completed" }, root);

    const r = await tool.execute(
      "tu5",
      { taskId: c, status: "completed" },
      new AbortController().signal,
      undefined,
      ctx(),
    );
    const text = r.content[0]?.type === "text" ? r.content[0].text : "";
    expect(text).not.toContain("NOTE:");
  });

  it("does NOT append nudge when verificationNudge: false", async () => {
    const tool = buildTaskUpdateTool({ tasksRoot: root, inheritedTaskListId: false, verificationNudge: false });
    const a = await createTask("sess", { subject: "alpha", description: "a" }, root);
    const b = await createTask("sess", { subject: "beta", description: "b" }, root);
    const c = await createTask("sess", { subject: "gamma", description: "c" }, root);
    await updateTask("sess", a, { status: "completed" }, root);
    await updateTask("sess", b, { status: "completed" }, root);

    const r = await tool.execute(
      "tu6",
      { taskId: c, status: "completed" },
      new AbortController().signal,
      undefined,
      ctx(),
    );
    const text = r.content[0]?.type === "text" ? r.content[0].text : "";
    expect(text).not.toContain("NOTE:");
  });
});
