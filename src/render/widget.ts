import type { Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";
import type { Task } from "../schema.js";
import { formatElapsed } from "./elapsed.js";
import { checkbox, styleTaskContent } from "./tree.js";

export type RenderTasksWidgetProps = {
  items: readonly Task[];
  theme: Theme;
  width: number;
  brand?: string;
  headerPrefix?: string;
  now?: number;
};

/** CC-style above-editor widget. Returns [] when items is empty. */
export function renderTasksWidget(props: RenderTasksWidgetProps): string[] {
  const { items, theme, width } = props;
  if (items.length === 0) return [];
  const now = props.now ?? Date.now();
  const brand = props.brand ?? "●";
  const headerPrefix = props.headerPrefix ?? "Tasks";

  const done = items.filter((i) => i.status === "completed").length;
  const active = items.find((i) => i.status === "in_progress");

  const headerText = active
    ? `${brand} ${active.activeForm ?? active.content}…${
        active.startedAt !== undefined ? ` (${formatElapsed(now - active.startedAt)})` : ""
      }`
    : `${brand} ${headerPrefix} · ${done}/${items.length} done`;

  const header = truncateToWidth(theme.fg("accent", headerText), width, "…");
  const rows = items.map((item) =>
    truncateToWidth(`   ${checkbox(item.status, theme)}  ${styleTaskContent(item, theme)}`, width, "…"),
  );
  return [header, ...rows];
}
