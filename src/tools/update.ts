import {
  type AgentToolResult,
  defineTool,
  type ExtensionContext,
  type SessionManager,
} from "@mariozechner/pi-coding-agent";
import { Value } from "@sinclair/typebox/value";
import { writeMarker } from "../common/markers.js";
import { type NudgeConfig, resolveNudge, shouldEmitNudge } from "../nudge.js";
import { TaskUpdateParams } from "../schema.js";
import { getTaskListId, type UpdateTaskResult, updateTask } from "../storage/index.js";
import { UPDATE_DESCRIPTION, UPDATE_PROMPT } from "./prompts/update.js";
import { refreshWidget, resolveToolDefaults, type ToolCommonConfig } from "./shared.js";

export type BuildTaskUpdateToolConfig = ToolCommonConfig & {
  inheritedTaskListId?: boolean;
  verificationNudge?: NudgeConfig;
  verifierAgentName?: string;
};

export type UpdateTaskToolDetails = UpdateTaskResult;

export function buildTaskUpdateTool(config: BuildTaskUpdateToolConfig = {}) {
  const { name, label, brand, headerPrefix, root } = resolveToolDefaults(config, {
    name: "task_update",
    label: "Task Update",
  });
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

      // No-op or not-found: don't refresh widget or emit audit/nudge.
      if (!result.success) {
        return {
          content: [{ type: "text", text: result.error ?? `Task #${taskId} not found` }],
          details: result,
        };
      }

      const tasks = await refreshWidget({ ctx, taskListId, toolName: name, brand, headerPrefix, root });

      void writeMarker("task-event", { kind: "update", taskId, fields: result.updatedFields });
      (ctx.sessionManager as SessionManager).appendCustomEntry("task-event", result);

      const baseText =
        result.updatedFields.length === 0
          ? `Updated task #${result.taskId}`
          : `Updated task #${result.taskId} ${result.updatedFields.join(", ")}`;

      const flippedToCompleted = result.statusChange?.to === "completed" && result.statusChange?.from !== "completed";
      const nudgeText = flippedToCompleted ? resolveNudge(nudgeConfig, verifierAgentName) : null;
      const text =
        nudgeText && shouldEmitNudge({ allTasks: tasks, inherited }) ? `${baseText}\n\n${nudgeText}` : baseText;

      return { content: [{ type: "text", text }], details: result };
    },
  });
}
