import { writeFile } from "node:fs/promises";
import { lock } from "proper-lockfile";
import { getTaskPath } from "../common/paths.js";
import type { TaskCreateInput } from "../schema.js";
import { findHighestTaskId, writeHighWaterMark } from "./hwm.js";
import { ensureTaskListLockFile, LOCK_OPTIONS } from "./locking.js";

/**
 * Create a task. Always assigns the next monotonic id and writes status: pending,
 * regardless of what the caller passed. Mirrors V2 createTask (tasks.ts:284-307).
 */
// biome-ignore lint/complexity/useMaxParams: third param is optional storage root override
export async function createTask(taskListId: string, input: TaskCreateInput, root?: string): Promise<string> {
  const lockPath = await ensureTaskListLockFile(taskListId, root);
  const release = await lock(lockPath, LOCK_OPTIONS);
  try {
    const highest = await findHighestTaskId(taskListId, root);
    const id = String(highest + 1);
    const path = getTaskPath(taskListId, id, root);

    const task = {
      id,
      subject: input.subject,
      description: input.description,
      ...(input.activeForm !== undefined ? { activeForm: input.activeForm } : {}),
      status: "pending" as const,
    };
    await writeFile(path, `${JSON.stringify(task, null, 2)}\n`);
    await writeHighWaterMark(taskListId, highest + 1, root);
    return id;
  } finally {
    await release();
  }
}
