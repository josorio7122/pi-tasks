import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTask, updateTask } from "../storage/index.js";
import { mockTheme } from "../test/mock-theme.js";
import { buildTaskListTool } from "./list.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-tool-list-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function ctx(): ExtensionContext {
  return {
    sessionManager: { getSessionId: () => "sess", getEntries: () => [], appendEntry: vi.fn() } as never,
    ui: { theme: mockTheme(), setWidget: vi.fn() },
  } as unknown as ExtensionContext;
}

describe("task_list tool", () => {
  it("returns 'No tasks found' on empty", async () => {
    const tool = buildTaskListTool({ tasksRoot: root });
    const r = await tool.execute("tl1", {}, new AbortController().signal, undefined, ctx());
    expect(r.content[0]?.type === "text" ? r.content[0].text : "").toBe("No tasks found");
  });

  it("returns '#<id> [<status>] <subject>' per line", async () => {
    const tool = buildTaskListTool({ tasksRoot: root });
    const a = await createTask("sess", { subject: "alpha", description: "a" }, root);
    const b = await createTask("sess", { subject: "beta", description: "b" }, root);
    await updateTask("sess", a, { status: "completed" }, root);

    const r = await tool.execute("tl2", {}, new AbortController().signal, undefined, ctx());
    const text = r.content[0]?.type === "text" ? r.content[0].text : "";
    expect(text).toBe(`#${a} [completed] alpha\n#${b} [pending] beta`);
  });
});
