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

type HeaderProps = {
  readonly items: readonly Task[];
  readonly now: number;
  readonly brand: string;
  readonly headerPrefix: string;
};

function headerFor(props: HeaderProps): string {
  const { items, now, brand, headerPrefix } = props;
  const done = items.filter((i) => i.status === "completed").length;
  const active = items.filter((i) => i.status === "in_progress");
  const soloActive = active.length === 1 ? active[0] : undefined;
  if (soloActive) {
    const elapsed = soloActive.startedAt !== undefined ? ` (${formatElapsed(now - soloActive.startedAt)})` : "";
    return `${brand} ${soloActive.activeForm ?? soloActive.subject}…${elapsed}`;
  }
  if (active.length > 1) return `${brand} ${active.length} running · ${done}/${items.length} done`;
  return `${brand} ${headerPrefix} · ${done}/${items.length} done`;
}

/** CC-style above-editor widget. Returns [] when items is empty. */
export function renderTasksWidget(props: RenderTasksWidgetProps): string[] {
  const { items, theme, width } = props;
  if (items.length === 0) return [];
  const now = props.now ?? Date.now();
  const brand = props.brand ?? "●";
  const headerPrefix = props.headerPrefix ?? "Tasks";

  const headerText = headerFor({ items, now, brand, headerPrefix });

  const header = truncateToWidth(theme.fg("accent", headerText), width, "…");
  const rows = items.map((item) =>
    truncateToWidth(`   ${checkbox(item.status, theme)}  ${styleTaskContent(item, theme)}`, width, "…"),
  );
  return [header, ...rows];
}
