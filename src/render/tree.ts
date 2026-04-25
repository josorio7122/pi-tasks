import type { Theme } from "@mariozechner/pi-coding-agent";
import type { Task, TaskStatus } from "../schema.js";

const CHECKBOX = "◼";
const CHECK = "✓";

export function checkbox(status: TaskStatus, theme: Theme): string {
  if (status === "in_progress") return theme.fg("text", CHECKBOX);
  if (status === "completed") return theme.fg("success", CHECK);
  return theme.fg("muted", CHECKBOX);
}

/** Style a task's content per status: strike+dim when completed, accent when in_progress, plain otherwise. */
export function styleTaskContent(item: Task, theme: Theme): string {
  if (item.status === "completed") return theme.fg("dim", theme.strikethrough(item.subject));
  if (item.status === "in_progress") return theme.fg("accent", item.subject);
  return item.subject;
}
