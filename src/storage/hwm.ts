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
  const dir = getTasksDir(taskListId, root);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return 0;
  }
  let highest = 0;
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const id = Number.parseInt(file.replace(".json", ""), 10);
    if (!Number.isNaN(id) && id > highest) highest = id;
  }
  return highest;
}

/** max(filesScan, hwm). Prevents id reuse after deletion. V2 verbatim (tasks.ts:271-277). */
export async function findHighestTaskId(taskListId: string, root?: string): Promise<number> {
  const [fromFiles, fromMark] = await Promise.all([
    findHighestTaskIdFromFiles(taskListId, root),
    readHighWaterMark(taskListId, root),
  ]);
  return Math.max(fromFiles, fromMark);
}
