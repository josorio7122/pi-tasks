import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the pi-tasks package root (for spawning pi with cwd set correctly). */
export function packageRoot(): string {
  return resolve(__dirname, "..", "..");
}

/**
 * Sanitize a string for safe filesystem path use. Mirrors V2 sanitizePathComponent
 * (V2 tasks.ts:217). Only allows [A-Za-z0-9_-]; everything
 * else becomes "-".
 */
export function sanitizePathComponent(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "-");
}

/** Default storage root, overridable via the `tasksRoot` config field on createTasksTools. */
export function tasksRoot(override?: string): string {
  return override ?? join(homedir(), ".pi", "agent", "tasks");
}

export function getTasksDir(taskListId: string, root?: string): string {
  return join(tasksRoot(root), sanitizePathComponent(taskListId));
}

// biome-ignore lint/complexity/useMaxParams: third param is optional storage root override
export function getTaskPath(taskListId: string, taskId: string, root?: string): string {
  return join(getTasksDir(taskListId, root), `${sanitizePathComponent(taskId)}.json`);
}

export function lockFilePath(taskListId: string, root?: string): string {
  return join(getTasksDir(taskListId, root), ".lock");
}

export function highWaterMarkPath(taskListId: string, root?: string): string {
  return join(getTasksDir(taskListId, root), ".highwatermark");
}
