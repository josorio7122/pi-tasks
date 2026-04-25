import {
  type AgentToolResult,
  defineTool,
  type ExtensionContext,
  type SessionManager,
} from "@mariozechner/pi-coding-agent";
import { Value } from "@sinclair/typebox/value";
import { writeMarker } from "../common/markers.js";
import { type NudgeConfig, resolveNudge, shouldEmitNudge } from "../nudge.js";
import { renderTasksWidget } from "../render/widget.js";
import { TaskUpdateParams } from "../schema.js";
import { getTaskListId, listTasks, type UpdateTaskResult, updateTask } from "../storage/index.js";
import { UPDATE_DESCRIPTION, UPDATE_PROMPT } from "./prompts/update.js";

export type BuildTaskUpdateToolConfig = {
  name?: string;
  label?: string;
  brand?: string;
  headerPrefix?: string;
  tasksRoot?: string;
  inheritedTaskListId?: boolean;
  verificationNudge?: NudgeConfig;
  verifierAgentName?: string;
};

export type UpdateTaskToolDetails = UpdateTaskResult;

export function buildTaskUpdateTool(config: BuildTaskUpdateToolConfig = {}) {
  const name = config.name ?? "task_update";
  const label = config.label ?? "Task Update";
  const brand = config.brand ?? "●";
  const headerPrefix = config.headerPrefix ?? "Tasks";
  const root = config.tasksRoot;
  const inherited = config.inheritedTaskListId ?? false;
  const nudgeConfig = config.verificationNudge;
  const verifierAgentName = config.verifierAgentName ?? "verifier";

  return defineTool({
    name,
    label,
    description: `${UPDATE_DESCRIPTION}\n\n${UPDATE_PROMPT}`,
    parameters: TaskUpdateParams,

    // biome-ignore lint/complexity/useMaxParams: pi's ToolDefinition signature is fixed
    async execute(
      _toolCallId,
      input,
      _signal,
      _onUpdate,
      ctx: ExtensionContext,
    ): Promise<AgentToolResult<UpdateTaskToolDetails>> {
      if (!Value.Check(TaskUpdateParams, input)) {
        return {
          content: [{ type: "text", text: "task_update: invalid input" }],
          details: { success: false, taskId: "", updatedFields: [] },
        };
      }

      const taskListId = getTaskListId(ctx);
      const { taskId, ...rest } = input;
      const result = await updateTask(taskListId, taskId, rest, root);

      // Failure path: don't refresh widget or emit audit/nudge on a no-op.
      if (!result.success) {
        return {
          content: [{ type: "text", text: result.error ?? `Task #${taskId} not found` }],
          details: result,
        };
      }

      // Widget refresh after a successful update.
      const tasks = await listTasks(taskListId, root);
      const widget = renderTasksWidget({ items: tasks, theme: ctx.ui.theme, width: 80, brand, headerPrefix });
      ctx.ui.setWidget(name, tasks.length === 0 ? undefined : widget);

      // Audit
      void writeMarker("task-event", { kind: "update", taskId, fields: result.updatedFields });
      (ctx.sessionManager as SessionManager).appendCustomEntry("task-event", result);

      let text =
        result.updatedFields.length === 0
          ? `Updated task #${result.taskId}`
          : `Updated task #${result.taskId} ${result.updatedFields.join(", ")}`;

      const flippedToCompleted = result.statusChange?.to === "completed" && result.statusChange?.from !== "completed";
      if (flippedToCompleted) {
        const nudgeText = resolveNudge(nudgeConfig, verifierAgentName);
        if (nudgeText && shouldEmitNudge({ allTasks: tasks, inherited })) {
          text += `\n\n${nudgeText}`;
        }
      }

      return { content: [{ type: "text", text }], details: result };
    },
  });
}
