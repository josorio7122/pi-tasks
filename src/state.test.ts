import { describe, expect, it } from "vitest";
import type { Task } from "./schema.js";
import { applyAction, reconstructTasks, type SessionEntryLike } from "./state.js";

const NOW = 1_000_000;

function base(): Task[] {
  return [
    { id: "1", content: "A", status: "pending" },
    { id: "2", content: "B", status: "pending" },
  ];
}

describe("applyAction", () => {
  it("list is a no-op", () => {
    expect(applyAction(base(), { action: "list" }, NOW)).toEqual(base());
  });

  it("clear returns []", () => {
    expect(applyAction(base(), { action: "clear" }, NOW)).toEqual([]);
  });

  it("replace returns the supplied items", () => {
    const items: Task[] = [{ id: "9", content: "New", status: "pending" }];
    expect(applyAction(base(), { action: "replace", items }, NOW)).toEqual(items);
  });

  it("add appends a new pending item with next id", () => {
    const result = applyAction(base(), { action: "add", content: "C", activeForm: "Cing" }, NOW);
    expect(result).toHaveLength(3);
    expect(result[2]).toEqual({ id: "3", content: "C", status: "pending", activeForm: "Cing" });
  });

  it("update applies field overrides without changing status", () => {
    const result = applyAction(base(), { action: "update", id: "1", content: "A!" }, NOW);
    expect(result[0]?.content).toBe("A!");
    expect(result[0]?.status).toBe("pending");
    expect(result[0]?.startedAt).toBeUndefined();
  });

  it("update transition pending → in_progress sets startedAt=now", () => {
    const result = applyAction(base(), { action: "update", id: "1", status: "in_progress" }, NOW);
    expect(result[0]?.status).toBe("in_progress");
    expect(result[0]?.startedAt).toBe(NOW);
  });

  it("update transition in_progress → completed clears startedAt", () => {
    const progressed: Task[] = [{ id: "1", content: "A", status: "in_progress", startedAt: NOW }];
    const result = applyAction(progressed, { action: "update", id: "1", status: "completed" }, NOW + 1000);
    expect(result[0]?.status).toBe("completed");
    expect(result[0]?.startedAt).toBeUndefined();
  });

  it("complete sets status=completed and clears startedAt", () => {
    const progressed: Task[] = [{ id: "1", content: "A", status: "in_progress", startedAt: NOW }];
    const result = applyAction(progressed, { action: "complete", id: "1" }, NOW);
    expect(result[0]?.status).toBe("completed");
    expect(result[0]?.startedAt).toBeUndefined();
  });

  it("remove filters the item out", () => {
    expect(applyAction(base(), { action: "remove", id: "1" }, NOW)).toEqual([
      { id: "2", content: "B", status: "pending" },
    ]);
  });

  it("idempotent in_progress → in_progress preserves the original startedAt", () => {
    const progressed: Task[] = [{ id: "1", content: "A", status: "in_progress", startedAt: NOW }];
    const result = applyAction(progressed, { action: "update", id: "1", status: "in_progress" }, NOW + 5000);
    expect(result[0]?.startedAt).toBe(NOW);
  });

  it("idempotent complete on an already-completed task keeps startedAt cleared", () => {
    const done: Task[] = [{ id: "1", content: "A", status: "completed" }];
    const result = applyAction(done, { action: "complete", id: "1" }, NOW);
    expect(result[0]?.status).toBe("completed");
    expect(result[0]?.startedAt).toBeUndefined();
  });

  it("replace returns a fresh array, not the caller's reference", () => {
    const items: Task[] = [{ id: "9", content: "New", status: "pending" }];
    const result = applyAction(base(), { action: "replace", items }, NOW);
    expect(result).toEqual(items);
    expect(result).not.toBe(items);
  });
});

describe("reconstructTasks", () => {
  it("returns [] when no entries match the tool name", () => {
    const entries: SessionEntryLike[] = [{ type: "message", message: { role: "user" } }];
    expect(reconstructTasks(entries, "task")).toEqual([]);
  });

  it("picks up the latest task-tool result using real pi session entry shape", () => {
    const entries: SessionEntryLike[] = [
      {
        type: "message",
        message: {
          role: "toolResult",
          toolName: "task",
          details: {
            tasks: [{ id: "1", content: "A", status: "pending" }],
            action: "add",
          },
        },
      },
    ];
    expect(reconstructTasks(entries, "task")).toEqual([{ id: "1", content: "A", status: "pending" }]);
  });

  it("uses the most recent matching entry", () => {
    const entries: SessionEntryLike[] = [
      {
        type: "message",
        message: {
          role: "toolResult",
          toolName: "task",
          details: { tasks: [{ id: "1", content: "old", status: "pending" }], action: "add" },
        },
      },
      {
        type: "message",
        message: {
          role: "toolResult",
          toolName: "task",
          details: { tasks: [{ id: "2", content: "new", status: "pending" }], action: "replace" },
        },
      },
    ];
    expect(reconstructTasks(entries, "task")[0]?.content).toBe("new");
  });

  it("also accepts the legacy flat shape { tool, details }", () => {
    const entries: SessionEntryLike[] = [
      { tool: "task", details: { tasks: [{ id: "1", content: "A", status: "pending" }], action: "add" } },
    ];
    expect(reconstructTasks(entries, "task")).toEqual([{ id: "1", content: "A", status: "pending" }]);
  });

  it("respects the toolName filter", () => {
    const entries: SessionEntryLike[] = [
      { tool: "other_tool", details: { tasks: [{ id: "1", content: "x", status: "pending" }], action: "add" } },
    ];
    expect(reconstructTasks(entries, "task")).toEqual([]);
  });
});
