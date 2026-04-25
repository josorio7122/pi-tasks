import { basename } from "node:path";
import type { ExtensionAPI, ExtensionContext, SessionStartEvent } from "@mariozechner/pi-coding-agent";
import { registerTasksTools } from "./api.js";
import { cloneTaskList, ensureTasksDir, getTaskListId, PI_TASK_LIST_ID_ENV } from "./storage/index.js";

/**
 * Extract a session id from a session file path. Pi stores sessions as
 *   <root>/<dir>/<id>.jsonl
 * so we strip the `.jsonl` extension from the basename.
 */
function sessionIdFromFile(file: string): string {
  const base = basename(file);
  return base.endsWith(".jsonl") ? base.slice(0, -".jsonl".length) : base;
}

/**
 * pi-tasks default extension entry — registers 4 V2-style tools and wires
 * lifecycle hooks. On every session_start: ensure the task dir exists and
 * publish PI_TASK_LIST_ID so spawned subagent processes inherit and share
 * the parent's task list. When reason === "fork", clone the parent task
 * dir into the new session id first so each branch gets its own snapshot.
 */
export default function tasksExtension(pi: ExtensionAPI): void {
  registerTasksTools(pi);

  pi.on("session_start", async (event: SessionStartEvent, ctx: ExtensionContext) => {
    const id = getTaskListId(ctx);

    if (event.reason === "fork" && event.previousSessionFile) {
      const parentId = sessionIdFromFile(event.previousSessionFile);
      if (parentId && parentId !== id) {
        await cloneTaskList(parentId, id);
      }
    }

    await ensureTasksDir(id);

    if (!process.env[PI_TASK_LIST_ID_ENV]) {
      process.env[PI_TASK_LIST_ID_ENV] = id;
    }
  });
}
