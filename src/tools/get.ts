import { type AgentToolResult, defineTool, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Value } from "@sinclair/typebox/value";
import { renderTasksWidget } from "../render/widget.js";
import { type Task, TaskGetParams } from "../schema.js";
import { getTask, getTaskListId, listTasks } from "../storage/index.js";
import { GET_DESCRIPTION, GET_PROMPT } from "./prompts/get.js";

export type BuildTaskGetToolConfig = {
  name?: string;
  label?: string;
  brand?: string;
  headerPrefix?: string;
  tasksRoot?: string;
};

export type GetTaskDetails = { task: Task | null };

export function buildTaskGetTool(config: BuildTaskGetToolConfig = {}) {
  const name = config.name ?? "task_get";
  const label = config.label ?? "Task Get";
  const brand = config.brand ?? "●";
  const headerPrefix = config.headerPrefix ?? "Tasks";
  const root = config.tasksRoot;

  return defineTool({
    name,
    label,
    description: `${GET_DESCRIPTION}\n\n${GET_PROMPT}`,
    parameters: TaskGetParams,

    // biome-ignore lint/complexity/useMaxParams: pi's ToolDefinition signature is fixed
    async execute(
      _toolCallId,
      input,
      _signal,
      _onUpdate,
      ctx: ExtensionContext,
    ): Promise<AgentToolResult<GetTaskDetails>> {
      if (!Value.Check(TaskGetParams, input)) {
        return {
          content: [{ type: "text", text: "task_get: invalid input" }],
          details: { task: null },
        };
      }

      const taskListId = getTaskListId(ctx);
      const task = await getTask(taskListId, input.taskId, root);

      const tasks = await listTasks(taskListId, root);
      const widget = renderTasksWidget({ items: tasks, theme: ctx.ui.theme, width: 80, brand, headerPrefix });
      ctx.ui.setWidget(name, tasks.length === 0 ? undefined : widget);

      if (!task) {
        return { content: [{ type: "text", text: "Task not found" }], details: { task: null } };
      }

      const text = [
        `Task #${task.id}: ${task.subject}`,
        `Status: ${task.status}`,
        `Description: ${task.description}`,
      ].join("\n");

      return { content: [{ type: "text", text }], details: { task } };
    },
  });
}
