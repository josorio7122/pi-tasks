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

const FIELDS_THAT_CAN_DIFFER = ["subject", "description", "activeForm"] as const;

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

    // Deletion path
    if (input.status === "deleted") {
      try {
        await unlink(getTaskPath(taskListId, taskId, root));
      } catch {
        // already gone — treat as success
      }
      return {
        success: true,
        taskId,
        updatedFields: ["deleted"],
        statusChange: { from: existing.status, to: "deleted" },
      };
    }

    const updates: Partial<Task> = {};
    const updatedFields: string[] = [];

    for (const k of FIELDS_THAT_CAN_DIFFER) {
      const next = input[k];
      if (next !== undefined && next !== existing[k]) {
        updates[k] = next;
        updatedFields.push(k);
      }
    }

    let statusChange: UpdateTaskResult["statusChange"];
    if (input.status !== undefined && input.status !== existing.status) {
      updates.status = input.status;
      updatedFields.push("status");
      statusChange = { from: existing.status, to: input.status };

      if (input.status === "in_progress") {
        updates.startedAt = Date.now();
      }
    }

    if (updatedFields.length === 0) {
      return { success: true, taskId, updatedFields: [] };
    }

    const merged: Task = {
      ...existing,
      ...updates,
    };
    if (merged.status !== "in_progress" && merged.startedAt !== undefined) {
      delete merged.startedAt;
    }

    await writeFile(getTaskPath(taskListId, taskId, root), `${JSON.stringify(merged, null, 2)}\n`);

    return {
      success: true,
      taskId,
      updatedFields,
      ...(statusChange ? { statusChange } : {}),
    };
  } finally {
    await release();
  }
}
