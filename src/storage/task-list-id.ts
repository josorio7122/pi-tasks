import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

export const PI_TASK_LIST_ID_ENV = "PI_TASK_LIST_ID";

/**
 * Resolve the active task list id.
 *
 * Mirrors V2 resolution chain at ~/Code/claude-code/src/utils/tasks.ts:199-210, with
 * swarm slots (in-process teammate context, PI_TEAM_NAME, leader team name) reserved
 * for future pi-agents support.
 *
 *   1. PI_TASK_LIST_ID env override (active — subagent carrier)
 *   2. (reserved) in-process teammate context
 *   3. (reserved) PI_TEAM_NAME env
 *   4. (reserved) leader team name (set by future TeamCreate)
 *   5. session id fallback
 */
export function getTaskListId(ctx: ExtensionContext): string {
  const fromEnv = process.env[PI_TASK_LIST_ID_ENV];
  if (fromEnv) return fromEnv;
  // future: teammate context, PI_TEAM_NAME, leader team
  return ctx.sessionManager.getSessionId();
}

/**
 * Was the env var already set when this module was first loaded?
 * Used by the verification nudge to skip when running inside a subagent
 * (subagent inherits the var from the parent; parent set it itself, so for the parent
 * the snapshot is undefined).
 */
export function isInheritedTaskListId(opts: { envSnapshot: string | undefined }): boolean {
  return opts.envSnapshot !== undefined;
}

/** Snapshot of PI_TASK_LIST_ID at module load time. Captured once. */
export const ENV_SNAPSHOT_AT_LOAD: string | undefined = process.env[PI_TASK_LIST_ID_ENV];
