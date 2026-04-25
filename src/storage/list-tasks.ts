import { readdir } from "node:fs/promises";
import { getTasksDir } from "../common/paths.js";
import type { Task } from "../schema.js";
import { getTask } from "./get-task.js";

/** List all tasks, ascending by numeric id. Skips files that fail schema validation. */
export async function listTasks(taskListId: string, root?: string): Promise<Task[]> {
  const dir = getTasksDir(taskListId, root);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const ids = files
    .filter((f) => f.endsWith(".json") && !f.startsWith("."))
    .map((f) => f.replace(".json", ""))
    .filter((id) => /^\d+$/.test(id))
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));

  const results = await Promise.all(ids.map((id) => getTask(taskListId, id, root)));
  return results.filter((t): t is Task => t !== null);
}
