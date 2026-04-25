import { cp, stat } from "node:fs/promises";
import { getTasksDir } from "../common/paths.js";

/**
 * Clone a parent's task list directory to a new task list id. Used on session_fork
 * so each branch gets its own snapshot — mutations don't bleed across branches.
 */
// biome-ignore lint/complexity/useMaxParams: third param is optional storage root override
export async function cloneTaskList(parentId: string, childId: string, root?: string): Promise<void> {
  const src = getTasksDir(parentId, root);
  const dst = getTasksDir(childId, root);
  try {
    await stat(src);
  } catch {
    return; // parent has no tasks dir — nothing to clone
  }
  await cp(src, dst, { recursive: true, force: true });
}
