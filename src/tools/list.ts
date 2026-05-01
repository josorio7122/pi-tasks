import { type AgentToolResult, defineTool, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { type Task, TaskListParams } from "../schema.js";
import { getTaskListId } from "../storage/index.js";
import { LIST_DESCRIPTION, LIST_PROMPT } from "./prompts/list.js";
import { refreshWidget, resolveToolDefaults, type ToolCommonConfig } from "./shared.js";

export type BuildTaskListToolConfig = ToolCommonConfig;

export type ListTasksDetails = { tasks: readonly Task[] };

export function buildTaskListTool(config: BuildTaskListToolConfig = {}) {
  const { name, label, brand, root, widgetKey } = resolveToolDefaults(config, {
    name: "task_list",
    label: "Task List",
  });

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
      const tasks = await refreshWidget({ ctx, taskListId, toolName: widgetKey, brand, root });

      const text =
        tasks.length === 0 ? "No tasks found" : tasks.map((t) => `#${t.id} [${t.status}] ${t.subject}`).join("\n");
      return { content: [{ type: "text", text }], details: { tasks } };
    },
  });
}
