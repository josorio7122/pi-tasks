import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { renderTasksWidget } from "../render/widget.js";
import type { Task } from "../schema.js";
import { listTasks } from "../storage/index.js";

const WIDGET_WIDTH = 80;

/** Config fields shared by all four tool factories. */
export type ToolCommonConfig = {
  name?: string;
  label?: string;
  brand?: string;
  headerPrefix?: string;
  tasksRoot?: string;
};

export type ResolvedToolDefaults = {
  name: string;
  label: string;
  brand: string;
  headerPrefix: string;
  root: string | undefined;
};

/** Apply defaults shared by all four tool factories. `name`/`label` fall back to per-tool values. */
export function resolveToolDefaults(
  config: ToolCommonConfig,
  fallback: { name: string; label: string },
): ResolvedToolDefaults {
  return {
    name: config.name ?? fallback.name,
    label: config.label ?? fallback.label,
    brand: config.brand ?? "●",
    headerPrefix: config.headerPrefix ?? "Tasks",
    root: config.tasksRoot,
  };
}

export type RefreshWidgetOptions = {
  ctx: ExtensionContext;
  taskListId: string;
  toolName: string;
  brand: string;
  headerPrefix: string;
  root: string | undefined;
};

/** Re-read the task list and push the rendered widget to the UI. Returns the task list. */
export async function refreshWidget(opts: RefreshWidgetOptions): Promise<Task[]> {
  const tasks = await listTasks(opts.taskListId, opts.root);
  const widget = renderTasksWidget({
    items: tasks,
    theme: opts.ctx.ui.theme,
    width: WIDGET_WIDTH,
    brand: opts.brand,
    headerPrefix: opts.headerPrefix,
  });
  opts.ctx.ui.setWidget(opts.toolName, tasks.length === 0 ? undefined : widget);
  return tasks;
}
