import { type AgentToolResult, defineTool, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Value } from "@sinclair/typebox/value";
import { type Task, TaskGetParams } from "../schema.js";
import { getTask, getTaskListId } from "../storage/index.js";
import { GET_DESCRIPTION, GET_PROMPT } from "./prompts/get.js";
import { refreshWidget, resolveToolDefaults, type ToolCommonConfig } from "./shared.js";

export type BuildTaskGetToolConfig = ToolCommonConfig;

export type GetTaskDetails = { task: Task | null };

export function buildTaskGetTool(config: BuildTaskGetToolConfig = {}) {
  const { name, label, brand, headerPrefix, root } = resolveToolDefaults(config, {
    name: "task_get",
    label: "Task Get",
  });

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

      // Read-only operation, but refresh anyway so the widget stays in sync with disk
      // if the user manually edited a task file between reads. V2 doesn't do this; we keep
      // it for consistency with task_list, which also refreshes on a read.
      await refreshWidget({ ctx, taskListId, toolName: name, brand, headerPrefix, root });

      if (!task) {
        return { content: [{ type: "text", text: "Task not found" }], details: { task: null } };
      }

      const text = `Task #${task.id}: ${task.subject}\nStatus: ${task.status}\nDescription: ${task.description}`;

      return { content: [{ type: "text", text }], details: { task } };
    },
  });
}
