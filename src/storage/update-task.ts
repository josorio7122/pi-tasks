import { unlink, writeFile } from "node:fs/promises";
import { lock } from "proper-lockfile";
import { getTaskPath } from "../common/paths.js";
import type { Task, TaskUpdateInput, TaskUpdateStatus } from "../schema.js";
import { getTask } from "./get-task.js";
import { ensureTaskListLockFile, LOCK_OPTIONS } from "./locking.js";

export type UpdateTaskResult = {
  success: boolean;
  taskId: string;
  updatedFields: string[];
  error?: string;
  statusChange?: { from: TaskUpdateStatus; to: TaskUpdateStatus };
};

const DIFFABLE_FIELDS = ["subject", "description", "activeForm"] as const;

type DiffableField = (typeof DIFFABLE_FIELDS)[number];

/** Pure: which diffable fields actually changed value? */
function changedFields(input: Omit<TaskUpdateInput, "taskId">, existing: Task): readonly DiffableField[] {
  return DIFFABLE_FIELDS.filter((k) => input[k] !== undefined && input[k] !== existing[k]);
}

/** Pure: drop startedAt when the merged task is no longer in_progress. */
function withoutStaleStartedAt(task: Task): Task {
  if (task.status === "in_progress" || task.startedAt === undefined) return task;
  const { startedAt: _stripped, ...rest } = task;
  return rest;
}

/** Update a task. Mirrors V2 TaskUpdateTool semantics (TaskUpdateTool.ts:123-274). */
// biome-ignore lint/complexity/useMaxParams: fourth param is optional storage root override
export async function updateTask(
  taskListId: string,
  taskId: string,
  input: Omit<TaskUpdateInput, "taskId">,
  root?: string,
): Promise<UpdateTaskResult> {
  const lockPath = await ensureTaskListLockFile(taskListId, root);
  const release = await lock(lockPath, LOCK_OPTIONS);
  try {
    const existing = await getTask(taskListId, taskId, root);
    if (!existing) {
      return { success: false, taskId, updatedFields: [], error: "Task not found" };
    }

    if (input.status === "deleted") {
      await unlink(getTaskPath(taskListId, taskId, root)).catch(() => {
        // already gone — treat as success
      });
      return {
        success: true,
        taskId,
        updatedFields: ["deleted"],
        statusChange: { from: existing.status, to: "deleted" },
      };
    }

    const fieldChanges = changedFields(input, existing);
    const nextStatus = input.status !== undefined && input.status !== existing.status ? input.status : undefined;
    const updatedFields = nextStatus !== undefined ? [...fieldChanges, "status"] : [...fieldChanges];

    if (updatedFields.length === 0) {
      return { success: true, taskId, updatedFields: [] };
    }

    const fieldUpdates = Object.fromEntries(fieldChanges.map((k) => [k, input[k]])) as Partial<Task>;
    const statusUpdates: Partial<Task> =
      nextStatus !== undefined
        ? { status: nextStatus, ...(nextStatus === "in_progress" ? { startedAt: Date.now() } : {}) }
        : {};
    const merged = withoutStaleStartedAt({ ...existing, ...fieldUpdates, ...statusUpdates });
    await writeFile(getTaskPath(taskListId, taskId, root), `${JSON.stringify(merged, null, 2)}\n`);

    return {
      success: true,
      taskId,
      updatedFields,
      ...(nextStatus !== undefined ? { statusChange: { from: existing.status, to: nextStatus } } : {}),
    };
  } finally {
    await release();
  }
}
