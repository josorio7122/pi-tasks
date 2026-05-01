import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, type vi } from "vitest";
import { makeMockContext } from "../test/mock-context.js";
import { buildTaskCreateTool } from "./create.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-tool-create-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("task_create tool", () => {
  it("returns 'Task #<id> created successfully: <subject>' (V2 wording)", async () => {
    const tool = buildTaskCreateTool({ tasksRoot: root });
    const ctx = makeMockContext();
    const r = await tool.execute(
      "tc1",
      { subject: "Build login flow", description: "Wire credential check." },
      new AbortController().signal,
      undefined,
      ctx,
    );
    const text = r.content[0]?.type === "text" ? r.content[0].text : "";
    expect(text).toBe("Task #1 created successfully: Build login flow");
  });

  it("forces status: pending even if rogue field smuggled (defense in depth)", async () => {
    const tool = buildTaskCreateTool({ tasksRoot: root });
    const ctx = makeMockContext();
    await tool.execute(
      "tc2",
      // biome-ignore lint/suspicious/noExplicitAny: smuggle test
      { subject: "x", description: "y", status: "completed" } as any,
      new AbortController().signal,
      undefined,
      ctx,
    );
    const { listTasks } = await import("../storage/list-tasks.js");
    const tasks = await listTasks("sess", root);
    expect(tasks[0]?.status).toBe("pending");
  });

  it("calls ui.setWidget with non-empty widget after create", async () => {
    const tool = buildTaskCreateTool({ tasksRoot: root });
    const ctx = makeMockContext();
    await tool.execute("tc3", { subject: "x", description: "y" }, new AbortController().signal, undefined, ctx);
    expect(ctx.ui.setWidget as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
  });

  it("sets the widget under the shared 'task' key (not 'task_create') so all four tools share one slot", async () => {
    const tool = buildTaskCreateTool({ tasksRoot: root });
    const ctx = makeMockContext();
    await tool.execute("tc4", { subject: "x", description: "y" }, new AbortController().signal, undefined, ctx);
    const calls = (ctx.ui.setWidget as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]?.[0]).toBe("task");
  });

  it("respects custom namePrefix when deriving the shared widget key", async () => {
    const tool = buildTaskCreateTool({ tasksRoot: root, name: "plan_create" });
    const ctx = makeMockContext();
    await tool.execute("tc5", { subject: "x", description: "y" }, new AbortController().signal, undefined, ctx);
    const calls = (ctx.ui.setWidget as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]?.[0]).toBe("plan");
  });
});
