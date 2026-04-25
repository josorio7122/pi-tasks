import { type AgentToolResult, defineTool, type ExtensionContext } from "@mariozechner/pi-coding-agent";
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
          // biome-ignore lint/suspicious/noExplicitAny: details typed for happy path
          details: { success: false, taskId: "", updatedFields: [] } as any,
          isError: true,
        };
      }

      const taskListId = getTaskListId(ctx);
      const { taskId, ...rest } = input;
      const result = await updateTask(taskListId, taskId, rest, root);

      // Widget refresh after every update. Wrapped in try/catch because the legacy
      // widget renderer still expects `Task.content`; Task 20 will migrate it to
      // `Task.subject`. Until then, swallow render errors so this tool stays green.
      const tasks = await listTasks(taskListId, root);
      let widget: string[] = [];
      try {
        widget = renderTasksWidget({ items: tasks, theme: ctx.ui.theme, width: 80, brand, headerPrefix });
      } catch {
        // legacy widget reads Task.content; tolerate until Task 20.
      }
      ctx.ui.setWidget(name, tasks.length === 0 ? undefined : widget);

      // Audit
      void writeMarker("task-event", { kind: "update", taskId, fields: result.updatedFields });
      const sm = ctx.sessionManager as unknown as { appendEntry?: (k: string, p: unknown) => void };
      sm.appendEntry?.("task-event", result);

      // Result text
      if (!result.success) {
        return {
          content: [{ type: "text", text: result.error ?? `Task #${taskId} not found` }],
          details: result,
        };
      }

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
