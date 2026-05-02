import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, beforeEach, describe, expect, it, type vi } from "vitest";
import { listTasks } from "../storage/list-tasks.js";
import { makeMockContext } from "../test/mock-context.js";
import { buildTaskCreateTool } from "./create.js";
import { _clearAllAutoResetTimers, _setAutoResetDelay } from "./shared.js";
import { buildTaskUpdateTool } from "./update.js";

let root: string;

const TEST_DELAY_MS = 30;
const SETTLE_MS = TEST_DELAY_MS * 3;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-auto-reset-"));
  // Use a tiny real-clock delay instead of fake timers — proper-lockfile relies
  // on real setTimeout for retry backoff inside resetTaskList, and faking it
  // hangs the lock acquisition.
  _setAutoResetDelay(TEST_DELAY_MS);
});

afterEach(() => {
  _clearAllAutoResetTimers();
  _setAutoResetDelay(undefined);
  rmSync(root, { recursive: true, force: true });
});

async function createOne(ctx: ReturnType<typeof makeMockContext>, subject: string): Promise<string> {
  const tool = buildTaskCreateTool({ tasksRoot: root });
  const r = await tool.execute(
    `c-${subject}`,
    { subject, description: subject },
    new AbortController().signal,
    undefined,
    ctx,
  );
  return (r.details as { taskId: string }).taskId;
}

async function complete(ctx: ReturnType<typeof makeMockContext>, taskId: string): Promise<void> {
  const tool = buildTaskUpdateTool({ tasksRoot: root, inheritedTaskListId: false });
  await tool.execute(`u-${taskId}`, { taskId, status: "completed" }, new AbortController().signal, undefined, ctx);
}

describe("auto-reset (V2 parity, useTasksV2.ts:113-172)", () => {
  it("resets the task list after the auto-reset delay once every task is completed", async () => {
    const ctx = makeMockContext();
    const id1 = await createOne(ctx, "a");
    const id2 = await createOne(ctx, "b");
    await complete(ctx, id1);
    expect(await listTasks("sess", root)).toHaveLength(2);
    await complete(ctx, id2);
    // Still present immediately after the final completion
    expect(await listTasks("sess", root)).toHaveLength(2);
    await delay(SETTLE_MS);
    expect(await listTasks("sess", root)).toEqual([]);
  });

  it("clears the widget slot when the auto-reset fires", async () => {
    const ctx = makeMockContext();
    const id = await createOne(ctx, "only");
    await complete(ctx, id);
    await delay(SETTLE_MS);
    const calls = (ctx.ui.setWidget as ReturnType<typeof vi.fn>).mock.calls;
    const last = calls[calls.length - 1];
    expect(last?.[1]).toBeUndefined();
  });

  it("does not auto-reset if a new task is created within the delay window", async () => {
    const ctx = makeMockContext();
    const id = await createOne(ctx, "a");
    await complete(ctx, id);
    // Land a new task before the delay elapses — should cancel the pending reset
    await createOne(ctx, "b");
    await delay(SETTLE_MS);
    const tasks = await listTasks("sess", root);
    expect(tasks).toHaveLength(2);
  });

  it("does not auto-reset if a task is reopened within the delay window", async () => {
    const ctx = makeMockContext();
    const id = await createOne(ctx, "a");
    await complete(ctx, id);
    const updateTool = buildTaskUpdateTool({ tasksRoot: root, inheritedTaskListId: false });
    await updateTool.execute(
      "reopen",
      { taskId: id, status: "in_progress" },
      new AbortController().signal,
      undefined,
      ctx,
    );
    await delay(SETTLE_MS);
    expect(await listTasks("sess", root)).toHaveLength(1);
  });

  it("does not arm a timer when the list still has incomplete tasks", async () => {
    const ctx = makeMockContext();
    const id1 = await createOne(ctx, "a");
    await createOne(ctx, "b");
    await complete(ctx, id1);
    await delay(SETTLE_MS);
    expect(await listTasks("sess", root)).toHaveLength(2);
  });
});
