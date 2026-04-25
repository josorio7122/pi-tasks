import { readdir, readFile, writeFile } from "node:fs/promises";
import { getTasksDir, highWaterMarkPath } from "../common/paths.js";

/** Read the high-water-mark file. Returns 0 when missing or unparseable. V2 verbatim (tasks.ts:114-123). */
export async function readHighWaterMark(taskListId: string, root?: string): Promise<number> {
  const path = highWaterMarkPath(taskListId, root);
  try {
    const content = (await readFile(path, "utf-8")).trim();
    const value = Number.parseInt(content, 10);
    return Number.isNaN(value) ? 0 : value;
  } catch {
    return 0;
  }
}

// biome-ignore lint/complexity/useMaxParams: third param is optional storage root override
export async function writeHighWaterMark(taskListId: string, value: number, root?: string): Promise<void> {
  await writeFile(highWaterMarkPath(taskListId, root), String(value));
}

async function findHighestTaskIdFromFiles(taskListId: string, root?: string): Promise<number> {
  const files = await readdir(getTasksDir(taskListId, root)).catch(() => [] as string[]);
  const ids = files
    .filter((f) => f.endsWith(".json"))
    .map((f) => Number.parseInt(f.replace(".json", ""), 10))
    .filter((n) => !Number.isNaN(n));
  return ids.length === 0 ? 0 : Math.max(...ids);
}

/** max(filesScan, hwm). Prevents id reuse after deletion. V2 verbatim (tasks.ts:271-277). */
export async function findHighestTaskId(taskListId: string, root?: string): Promise<number> {
  const [fromFiles, fromMark] = await Promise.all([
    findHighestTaskIdFromFiles(taskListId, root),
    readHighWaterMark(taskListId, root),
  ]);
  return Math.max(fromFiles, fromMark);
}
