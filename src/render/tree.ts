import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import type { Task, TaskStatus } from "../schema.js";

const CHECKBOX = "◼";
const CHECK = "✓";
export const CROSS = "✗";
export const BULLET = "●";
export const BRANCH = "⎿";

export type BulletProps = { label: string; theme: Theme; width?: number };

export function bullet(props: BulletProps): string {
  const line = `${props.theme.fg("accent", BULLET)} ${props.label}`;
  if (props.width === undefined) return line;
  return truncateToWidth(line, props.width, "…");
}

export type BranchProps = { text: string; theme: Theme; indent?: number; width?: number };

export function branch(props: BranchProps): string {
  const spaces = " ".repeat(props.indent ?? 2);
  const line = `${spaces}${props.theme.fg("dim", BRANCH)}  ${props.text}`;
  if (props.width === undefined) return line;
  return truncateToWidth(line, props.width, "…");
}

export function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}

export function checkbox(status: TaskStatus, theme: Theme): string {
  if (status === "in_progress") return theme.fg("text", CHECKBOX);
  if (status === "completed") return theme.fg("success", CHECK);
  return theme.fg("muted", CHECKBOX);
}

/** Style a task's content per status: strike+dim when completed, accent when in_progress, plain otherwise. */
export function styleTaskContent(item: Task, theme: Theme): string {
  if (item.status === "completed") return theme.fg("dim", theme.strikethrough(item.content));
  if (item.status === "in_progress") return theme.fg("accent", item.content);
  return item.content;
}
