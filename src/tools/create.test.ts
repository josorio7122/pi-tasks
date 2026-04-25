import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockTheme } from "../test/mock-theme.js";
import { buildTaskCreateTool } from "./create.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-tool-create-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function makeCtx(): ExtensionContext {
  const setWidget = vi.fn();
  return {
    sessionManager: { getSessionId: () => "sess", getEntries: () => [], appendEntry: vi.fn() } as never,
    ui: { theme: mockTheme(), setWidget },
  } as unknown as ExtensionContext;
}

describe("task_create tool", () => {
  it("returns 'Task #<id> created successfully: <subject>' (V2 wording)", async () => {
    const tool = buildTaskCreateTool({ tasksRoot: root });
    const ctx = makeCtx();
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
    const ctx = makeCtx();
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
    const ctx = makeCtx();
    await tool.execute("tc3", { subject: "x", description: "y" }, new AbortController().signal, undefined, ctx);
    expect(ctx.ui.setWidget as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
  });
});
