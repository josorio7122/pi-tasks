import { Value } from "@sinclair/typebox/value";
import { type Task, type TaskAction, TaskDetailsSchema } from "./schema.js";

export type SessionEntryLike = {
  type?: string;
  message?: { role?: string; toolName?: string; details?: unknown };
  tool?: string;
  details?: unknown;
};

function nextId(existing: readonly Task[]): string {
  const nums = existing.map((i) => Number.parseInt(i.id, 10)).filter((n) => !Number.isNaN(n));
  return String(Math.max(0, ...nums) + 1);
}

type TransitionProps = { item: Task; nextStatus: Task["status"]; now: number };

function transitionStatus({ item, nextStatus, now }: TransitionProps): Task {
  if (nextStatus === "in_progress") {
    // Preserve an existing timer on idempotent in_progress → in_progress; stamp otherwise.
    return item.status === "in_progress" && item.startedAt !== undefined
      ? { ...item, status: nextStatus }
      : { ...item, status: nextStatus, startedAt: now };
  }
  // Any non-in_progress status means no running timer — always strip startedAt.
  const { startedAt: _startedAt, ...rest } = item;
  return { ...rest, status: nextStatus };
}

/** Apply an action to the current task list. Pure. Optional `now` enables deterministic tests. */
// biome-ignore lint/complexity/useMaxParams: third param is optional clock injection for tests
export function applyAction(items: readonly Task[], action: TaskAction, now: number = Date.now()): Task[] {
  switch (action.action) {
    case "list":
      return [...items];
    case "clear":
      return [];
    case "replace":
      // Defensive copy so callers cannot retain an aliased reference into our state.
      return [...action.items];
    case "add": {
      const item: Task = {
        id: nextId(items),
        content: action.content,
        status: "pending",
        ...(action.activeForm ? { activeForm: action.activeForm } : {}),
      };
      return [...items, item];
    }
    case "update":
      return items.map((i) => {
        if (i.id !== action.id) return i;
        const withFields: Task = {
          ...i,
          ...(action.content ? { content: action.content } : {}),
          ...(action.activeForm ? { activeForm: action.activeForm } : {}),
        };
        return action.status ? transitionStatus({ item: withFields, nextStatus: action.status, now }) : withFields;
      });
    case "complete":
      return items.map((i) => (i.id === action.id ? transitionStatus({ item: i, nextStatus: "completed", now }) : i));
    case "remove":
      return items.filter((i) => i.id !== action.id);
  }
}

function entryToolName(entry: SessionEntryLike): string | undefined {
  if (entry.message?.role === "toolResult" && typeof entry.message.toolName === "string") {
    return entry.message.toolName;
  }
  return entry.tool;
}

function entryDetails(entry: SessionEntryLike): unknown {
  return entry.message?.role === "toolResult" ? entry.message.details : entry.details;
}

/** Walk pi session entries backward and return the most recent task-tool result matching `toolName`. */
export function reconstructTasks(entries: readonly SessionEntryLike[], toolName: string): Task[] {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (!entry || entryToolName(entry) !== toolName) continue;
    const details = entryDetails(entry);
    // Clone so consumers cannot mutate our view of session history.
    return Value.Check(TaskDetailsSchema, details) ? [...details.tasks] : [];
  }
  return [];
}
