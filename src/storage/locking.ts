import { mkdir, writeFile } from "node:fs/promises";
import { getTasksDir, lockFilePath } from "../common/paths.js";

/**
 * Verbatim port of V2 LOCK_OPTIONS (V2 tasks.ts:102-108).
 *
 * Budget sized for ~10+ concurrent agents: each critical section does
 * readdir + N×readFile + writeFile (~50-100ms on slow disks), so the last
 * caller in a 10-way race needs ~900ms. retries=30 gives ~2.6s total wait.
 */
export const LOCK_OPTIONS = {
  retries: {
    retries: 30,
    minTimeout: 5,
    maxTimeout: 100,
  },
} as const;

/** Create the task list directory if missing. Idempotent. */
export async function ensureTasksDir(taskListId: string, root?: string): Promise<void> {
  const dir = getTasksDir(taskListId, root);
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    // Directory already exists or creation failed; callers will surface
    // errors from subsequent operations.
  }
}

/**
 * Ensure the lock file for a task list exists. proper-lockfile requires the target
 * file to exist before locking. Mirrors V2 ensureTaskListLockFile (tasks.ts:511-523).
 */
export async function ensureTaskListLockFile(taskListId: string, root?: string): Promise<string> {
  await ensureTasksDir(taskListId, root);
  const path = lockFilePath(taskListId, root);
  try {
    await writeFile(path, "", { flag: "wx" });
  } catch {
    // EEXIST or other — file already exists, which is fine.
  }
  return path;
}
