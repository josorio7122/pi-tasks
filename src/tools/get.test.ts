import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTask } from "../storage/index.js";
import { makeMockContext } from "../test/mock-context.js";
import { buildTaskGetTool } from "./get.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-tool-get-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("task_get tool", () => {
  it("returns 'Task not found' on missing", async () => {
    const tool = buildTaskGetTool({ tasksRoot: root });
    const r = await tool.execute("tg1", { taskId: "999" }, new AbortController().signal, undefined, makeMockContext());
    expect(r.content[0]?.type === "text" ? r.content[0].text : "").toBe("Task not found");
  });

  it("returns multi-line subject/status/description", async () => {
    const tool = buildTaskGetTool({ tasksRoot: root });
    const id = await createTask("sess", { subject: "Build login", description: "wire it" }, root);
    const r = await tool.execute("tg2", { taskId: id }, new AbortController().signal, undefined, makeMockContext());
    const text = r.content[0]?.type === "text" ? r.content[0].text : "";
    expect(text).toBe(`Task #${id}: Build login\nStatus: pending\nDescription: wire it`);
  });
});
