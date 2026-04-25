import { readFile } from "node:fs/promises";
import { Value } from "@sinclair/typebox/value";
import { getTaskPath } from "../common/paths.js";
import { type Task, TaskSchema } from "../schema.js";

/** Read one task. Returns null when missing or unparseable. V2 mirrors (tasks.ts:310-323). */
// biome-ignore lint/complexity/useMaxParams: third param is optional storage root override
export async function getTask(taskListId: string, taskId: string, root?: string): Promise<Task | null> {
  const path = getTaskPath(taskListId, taskId, root);
  try {
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content);
    if (!Value.Check(TaskSchema, parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
