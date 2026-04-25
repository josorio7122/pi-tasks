import { type AgentToolResult, defineTool, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { renderTasksWidget } from "../render/widget.js";
import { type Task, TaskListParams } from "../schema.js";
import { getTaskListId, listTasks } from "../storage/index.js";
import { LIST_DESCRIPTION, LIST_PROMPT } from "./prompts/list.js";

export type BuildTaskListToolConfig = {
  name?: string;
  label?: string;
  brand?: string;
  headerPrefix?: string;
  tasksRoot?: string;
};

export type ListTasksDetails = { tasks: Task[] };

export function buildTaskListTool(config: BuildTaskListToolConfig = {}) {
  const name = config.name ?? "task_list";
  const label = config.label ?? "Task List";
  const brand = config.brand ?? "●";
  const headerPrefix = config.headerPrefix ?? "Tasks";
  const root = config.tasksRoot;

  return defineTool({
    name,
    label,
    description: `${LIST_DESCRIPTION}\n\n${LIST_PROMPT}`,
    parameters: TaskListParams,

    // biome-ignore lint/complexity/useMaxParams: pi's ToolDefinition signature is fixed
    async execute(
      _toolCallId,
      _input,
      _signal,
      _onUpdate,
      ctx: ExtensionContext,
    ): Promise<AgentToolResult<ListTasksDetails>> {
      const taskListId = getTaskListId(ctx);
      const tasks = await listTasks(taskListId, root);

      const widget = renderTasksWidget({ items: tasks, theme: ctx.ui.theme, width: 80, brand, headerPrefix });
      ctx.ui.setWidget(name, tasks.length === 0 ? undefined : widget);

      const text =
        tasks.length === 0 ? "No tasks found" : tasks.map((t) => `#${t.id} [${t.status}] ${t.subject}`).join("\n");
      return { content: [{ type: "text", text }], details: { tasks } };
    },
  });
}
