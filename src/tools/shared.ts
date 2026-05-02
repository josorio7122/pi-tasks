import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { writeMarker } from "../common/markers.js";
import { renderTasksWidget } from "../render/widget.js";
import type { Task } from "../schema.js";
import { listTasks, resetTaskList } from "../storage/index.js";

const WIDGET_WIDTH = 80;

/**
 * Verbatim port of V2's auto-clean delay (useTasksV2.ts:16). When all tasks
 * become completed, V2 schedules a 5-second timer; if a new task or status
 * change arrives within the window the timer is cancelled, otherwise the
 * timer fires and `resetTaskList` deletes every task file.
 */
export const AUTO_RESET_DELAY_MS = 5000;

let autoResetDelayOverride: number | undefined;

/** Test-only override; production code should use AUTO_RESET_DELAY_MS. */
export function _setAutoResetDelay(ms: number | undefined): void {
  autoResetDelayOverride = ms;
}

function autoResetDelay(): number {
  return autoResetDelayOverride ?? AUTO_RESET_DELAY_MS;
}

/** Config fields shared by all four tool factories. */
export type ToolCommonConfig = {
  name?: string;
  label?: string;
  brand?: string;
  tasksRoot?: string;
};

export type ResolvedToolDefaults = {
  name: string;
  label: string;
  brand: string;
  root: string | undefined;
  widgetKey: string;
};

const WIDGET_KEY_SUFFIX_RE = /_(create|update|list|get)$/;

/**
 * Derive the shared widget key from a tool name. All four tools in a set
 * share the same widget slot — otherwise pi keeps four distinct widgets
 * keyed by tool name and stacks them in the UI. The default scheme is
 * `<namePrefix>_(create|update|list|get)`, so stripping the suffix
 * yields the prefix and produces a single shared key.
 */
function deriveWidgetKey(name: string): string {
  return name.replace(WIDGET_KEY_SUFFIX_RE, "");
}

/** Apply defaults shared by all four tool factories. `name`/`label` fall back to per-tool values. */
export function resolveToolDefaults(
  config: ToolCommonConfig,
  fallback: { name: string; label: string },
): ResolvedToolDefaults {
  const name = config.name ?? fallback.name;
  return {
    name,
    label: config.label ?? fallback.label,
    brand: config.brand ?? "●",
    root: config.tasksRoot,
    widgetKey: deriveWidgetKey(name),
  };
}

export type RefreshWidgetOptions = {
  ctx: ExtensionContext;
  taskListId: string;
  toolName: string;
  brand: string;
  root: string | undefined;
};

const hideTimers = new Map<string, NodeJS.Timeout>();

function clearHideTimer(taskListId: string): void {
  const t = hideTimers.get(taskListId);
  if (t) {
    clearTimeout(t);
    hideTimers.delete(taskListId);
  }
}

/**
 * Mirrors V2 (useTasksV2.ts:113-152, :154-172). Called after every widget
 * refresh; if the list is non-empty and every task is completed, schedules
 * an auto-reset 5 seconds out. Any subsequent refresh that finds an
 * incomplete task (or empty list) cancels the pending timer. When the
 * timer fires it re-verifies under read, then runs `resetTaskList` (which
 * unlinks all task files under lock and bumps the high-water-mark) and
 * clears the widget slot.
 */
function maybeScheduleAutoReset(opts: {
  taskListId: string;
  tasks: readonly Task[];
  ctx: ExtensionContext;
  toolName: string;
  root: string | undefined;
}): void {
  const allCompleted = opts.tasks.length > 0 && opts.tasks.every((t) => t.status === "completed");
  if (!allCompleted) {
    clearHideTimer(opts.taskListId);
    return;
  }
  if (hideTimers.has(opts.taskListId)) return;
  const timer = setTimeout(async () => {
    hideTimers.delete(opts.taskListId);
    const fresh = await listTasks(opts.taskListId, opts.root);
    const stillAllCompleted = fresh.length > 0 && fresh.every((t) => t.status === "completed");
    if (!stillAllCompleted) return;
    await resetTaskList(opts.taskListId, opts.root);
    opts.ctx.ui.setWidget(opts.toolName, undefined);
    void writeMarker("task-event", { kind: "auto-reset", taskListId: opts.taskListId });
  }, autoResetDelay());
  timer.unref();
  hideTimers.set(opts.taskListId, timer);
}

/** Re-read the task list and push the rendered widget to the UI. Returns the task list. */
export async function refreshWidget(opts: RefreshWidgetOptions): Promise<Task[]> {
  const tasks = await listTasks(opts.taskListId, opts.root);
  const widget = renderTasksWidget({
    items: tasks,
    theme: opts.ctx.ui.theme,
    width: WIDGET_WIDTH,
    brand: opts.brand,
  });
  opts.ctx.ui.setWidget(opts.toolName, tasks.length === 0 ? undefined : widget);
  maybeScheduleAutoReset({
    taskListId: opts.taskListId,
    tasks,
    ctx: opts.ctx,
    toolName: opts.toolName,
    root: opts.root,
  });
  return tasks;
}

/**
 * Strip keys whose value is `undefined`. Lets us spread an options object into
 * a target without tripping `exactOptionalPropertyTypes` — `{ x: undefined }`
 * is not assignable to `{ x?: string }` under that flag, but a missing key is.
 */
export function pickDefined<T extends Record<string, unknown>>(obj: T): { [K in keyof T]?: NonNullable<T[K]> } {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as { [K in keyof T]?: NonNullable<T[K]> };
}

/**
 * Test-only handle to flush any pending auto-reset timers. Tests use fake
 * timers + `vi.runAllTimers`; this is exposed for clean teardown when a
 * test wants to ensure no timer leaks across cases.
 */
export function _clearAllAutoResetTimers(): void {
  for (const id of hideTimers.keys()) clearHideTimer(id);
}
