import type { Task } from "./schema.js";

export type NudgeConfig = boolean | string | undefined;

export function DEFAULT_VERIFICATION_NUDGE(verifierAgentName: string): string {
  return [
    "NOTE: You just closed out 3+ tasks and none of them was a verification step.",
    "Before writing your final summary, spawn the verifier subagent:",
    "",
    `  subagent(agent: "${verifierAgentName}", task: "Verify the closed task list above.")`,
    "",
    "You cannot self-assign success by listing caveats in your summary —",
    "verification is what produces a verdict.",
  ].join("\n");
}

/** Returns null when nudge is disabled, otherwise the resolved text. */
export function resolveNudge(config: NudgeConfig, verifierAgentName: string): string | null {
  if (config === false) return null;
  if (typeof config === "string") return config;
  return DEFAULT_VERIFICATION_NUDGE(verifierAgentName);
}

/**
 * Mirror V2 verification nudge predicate (TaskUpdateTool.ts:333-349) minus growthbook.
 *
 * Trigger when ALL of:
 *  - >= 3 tasks total
 *  - all tasks completed
 *  - no subject matches /verif/i
 *  - not running in a subagent (inherited === false)
 */
export function shouldEmitNudge(opts: { allTasks: Task[]; inherited: boolean }): boolean {
  const { allTasks, inherited } = opts;
  if (inherited) return false;
  if (allTasks.length < 3) return false;
  if (!allTasks.every((t) => t.status === "completed")) return false;
  if (allTasks.some((t) => /verif/i.test(t.subject))) return false;
  return true;
}
