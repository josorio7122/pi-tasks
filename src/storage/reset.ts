import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import lockfile from "proper-lockfile";
import { getTasksDir } from "../common/paths.js";
import { findHighestTaskId, writeHighWaterMark } from "./hwm.js";
import { ensureTaskListLockFile, LOCK_OPTIONS } from "./locking.js";

/**
 * Verbatim port of V2's `resetTaskList` (tasks.ts:147-188).
 *
 * Wipes all task files for a list under lock and bumps the high-water-mark
 * file so subsequent IDs don't reuse the deleted ones. V2 calls this from
 * its 5-second auto-clean timer (useTasksV2.ts:165) after the final task
 * completes, and from `TeamCreateTool` when starting a fresh swarm.
 */
export async function resetTaskList(taskListId: string, root?: string): Promise<void> {
  const dir = getTasksDir(taskListId, root);
  const lockPath = await ensureTaskListLockFile(taskListId, root);
  let release: (() => Promise<void>) | undefined;
  try {
    release = await lockfile.lock(lockPath, LOCK_OPTIONS);

    const highest = await findHighestTaskId(taskListId, root);
    if (highest > 0) await writeHighWaterMark(taskListId, highest, root);

    let files: string[] = [];
    try {
      files = await readdir(dir);
    } catch {
      // dir missing — nothing to delete
    }
    for (const file of files) {
      if (file.endsWith(".json") && !file.startsWith(".")) {
        try {
          await unlink(join(dir, file));
        } catch {
          // already gone — fine
        }
      }
    }
  } finally {
    if (release) await release();
  }
}
