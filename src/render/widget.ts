import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import type { Task } from "../schema.js";
import { checkbox, styleTaskContent } from "./tree.js";

export type RenderTasksWidgetProps = {
  items: readonly Task[];
  theme: Theme;
  width: number;
  brand?: string;
};

type HeaderProps = {
  readonly items: readonly Task[];
  readonly brand: string;
};

/**
 * V2-parity panel header: aggregate counts only. Mirrors Claude Code's
 * `<N> tasks (<done> done, <inProgress> in progress, <pending> open)`.
 *
 * The in_progress row is highlighted in `accent` color by `styleTaskContent`,
 * so the panel never needs to flip its title to surface "what's active". The
 * spinner-style `activeForm` flip lives in V2's separate Spinner component;
 * pi has its own spinner, and the task `activeForm` field is preserved in
 * storage and tool-result text for any future consumer.
 */
function headerFor(props: HeaderProps): string {
  const { items, brand } = props;
  const total = items.length;
  const done = items.filter((i) => i.status === "completed").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const open = items.filter((i) => i.status === "pending").length;
  const parts = [`${done} done`];
  if (inProgress > 0) parts.push(`${inProgress} in progress`);
  parts.push(`${open} open`);
  return `${brand} ${total} tasks (${parts.join(", ")})`;
}

/** CC-style above-editor widget. Returns [] when items is empty. */
export function renderTasksWidget(props: RenderTasksWidgetProps): string[] {
  const { items, theme, width } = props;
  if (items.length === 0) return [];
  const brand = props.brand ?? "●";

  const headerText = headerFor({ items, brand });

  const header = truncateToWidth(theme.fg("accent", headerText), width, "…");
  const rows = items.map((item) =>
    truncateToWidth(`   ${checkbox(item.status, theme)}  ${styleTaskContent(item, theme)}`, width, "…"),
  );
  return [header, ...rows];
}
