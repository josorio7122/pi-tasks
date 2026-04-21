import { describe, expect, it, vi } from "vitest";
import { makeMockTheme } from "./test/mock-theme.js";
import { createTasksTool } from "./tool.js";

function makeCtx(entries: unknown[] = []) {
  const theme = makeMockTheme();
  return {
    sessionManager: { getEntries: () => entries },
    ui: {
      theme,
      setWidget: vi.fn(),
    },
  } as never;
}

describe("createTasksTool", () => {
  it("uses default name 'task' and label 'Tasks'", () => {
    const tool = createTasksTool();
    expect(tool.name).toBe("task");
    expect(tool.label).toBe("Tasks");
  });

  it("honors config overrides for name/label/description", () => {
    const tool = createTasksTool({ name: "my_task", label: "My", description: "X" });
    expect(tool.name).toBe("my_task");
    expect(tool.label).toBe("My");
    expect(tool.description).toBe("X");
  });

  it("add action returns one task and sets the widget", async () => {
    const tool = createTasksTool();
    const ctx = makeCtx();
    const result = await tool.execute(
      "call-1",
      { action: "add", content: "Build X", activeForm: "Building X" },
      undefined,
      undefined,
      ctx,
    );
    expect(result.details.tasks).toHaveLength(1);
    expect(result.details.tasks[0]?.content).toBe("Build X");
    const setWidget = (ctx as unknown as { ui: { setWidget: ReturnType<typeof vi.fn> } }).ui.setWidget;
    expect(setWidget).toHaveBeenCalledTimes(1);
    expect(setWidget).toHaveBeenCalledWith("task", expect.any(Array));
  });

  it("mutating on empty prior state returns error result", async () => {
    const tool = createTasksTool();
    const ctx = makeCtx();
    const result = await tool.execute("call-1", { action: "complete", id: "1" }, undefined, undefined, ctx);
    expect(result.details.action).toBe("error");
  });

  it("rejects invalid input with error panel", async () => {
    const tool = createTasksTool();
    const ctx = makeCtx();
    const result = await tool.execute("call-1", { action: "bogus" }, undefined, undefined, ctx);
    expect(result.details.action).toBe("error");
  });

  it("reconstructs prior state from session entries using configured name", async () => {
    const tool = createTasksTool({ name: "my_task" });
    const ctx = makeCtx([
      {
        type: "message",
        message: {
          role: "toolResult",
          toolName: "my_task",
          details: { tasks: [{ id: "5", content: "Existing", status: "pending" }], action: "add" },
        },
      },
    ]);
    const result = await tool.execute("call-1", { action: "complete", id: "5" }, undefined, undefined, ctx);
    expect(result.details.tasks).toHaveLength(1);
    expect(result.details.tasks[0]?.status).toBe("completed");
  });

  it("clears widget when tasks become empty", async () => {
    const tool = createTasksTool();
    const ctx = makeCtx([
      {
        type: "message",
        message: {
          role: "toolResult",
          toolName: "task",
          details: { tasks: [{ id: "1", content: "A", status: "pending" }], action: "add" },
        },
      },
    ]);
    await tool.execute("call-1", { action: "clear" }, undefined, undefined, ctx);
    const setWidget = (ctx as unknown as { ui: { setWidget: ReturnType<typeof vi.fn> } }).ui.setWidget;
    expect(setWidget).toHaveBeenCalledWith("task", undefined);
  });

  it("content.text is the plain-text Task(subject: transition) label with no ANSI", async () => {
    const tool = createTasksTool();
    const ctx = makeCtx();
    const result = await tool.execute(
      "call-1",
      { action: "add", content: "Build X", activeForm: "Building X" },
      undefined,
      undefined,
      ctx,
    );
    const text = result.content[0]?.type === "text" ? result.content[0].text : "";
    expect(text).not.toContain("\x1b[");
    expect(text).toBe("Task(Build X: added)");
  });

  it("details carry subject + transition for the affected task", async () => {
    const tool = createTasksTool();
    const ctx = makeCtx();
    const result = await tool.execute(
      "call-1",
      { action: "add", content: "Build X", activeForm: "Building X" },
      undefined,
      undefined,
      ctx,
    );
    expect(result.details.subject).toBe("Build X");
    expect(result.details.transition).toBe("added");
  });

  it("update → in_progress yields transition=started", async () => {
    const tool = createTasksTool({ name: "t" });
    const ctx = makeCtx([
      {
        type: "message",
        message: {
          role: "toolResult",
          toolName: "t",
          details: { tasks: [{ id: "1", content: "A", status: "pending" }], action: "add" },
        },
      },
    ]);

    const result = await tool.execute(
      "call-1",
      { action: "update", id: "1", status: "in_progress" },
      undefined,
      undefined,
      ctx,
    );
    expect(result.details.transition).toBe("started");
    expect(result.details.subject).toBe("A");
  });

  it("replace yields a bulk subject phrase", async () => {
    const tool = createTasksTool();
    const ctx = makeCtx();
    const result = await tool.execute(
      "call-1",
      { action: "replace", items: [{ id: "1", content: "A", status: "pending" }] },
      undefined,
      undefined,
      ctx,
    );
    expect(result.details.subject).toBe("1 task");
    expect(result.details.transition).toBe("replaced");
  });

  it("clear yields no subject, transition=cleared", async () => {
    const tool = createTasksTool();
    const ctx = makeCtx();
    const result = await tool.execute("call-1", { action: "clear" }, undefined, undefined, ctx);
    expect(result.details.subject).toBeUndefined();
    expect(result.details.transition).toBe("cleared");
  });
});
