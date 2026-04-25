import {
  type AgentToolResult,
  defineTool,
  type ExtensionContext,
  type SessionManager,
} from "@mariozechner/pi-coding-agent";
import { Value } from "@sinclair/typebox/value";
import { writeMarker } from "../common/markers.js";
import { type TaskCreateInput, TaskCreateParams } from "../schema.js";
import { createTask, getTaskListId } from "../storage/index.js";
import { CREATE_DESCRIPTION, CREATE_PROMPT } from "./prompts/create.js";
import { refreshWidget, resolveToolDefaults, type ToolCommonConfig } from "./shared.js";

export type BuildTaskCreateToolConfig = ToolCommonConfig;

export type CreateTaskDetails = {
  taskId: string;
  subject: string;
};

export function buildTaskCreateTool(config: BuildTaskCreateToolConfig = {}) {
  const { name, label, brand, headerPrefix, root } = resolveToolDefaults(config, {
    name: "task_create",
    label: "Task Create",
  });

  return defineTool({
    name,
    label,
    description: `${CREATE_DESCRIPTION}\n\n${CREATE_PROMPT}`,
    parameters: TaskCreateParams,

    // biome-ignore lint/complexity/useMaxParams: pi's ToolDefinition signature is fixed
    async execute(
      _toolCallId,
      input,
      _signal,
      _onUpdate,
      ctx: ExtensionContext,
    ): Promise<AgentToolResult<CreateTaskDetails>> {
      // Pull only the known fields. Extra fields (e.g. a smuggled `status`) are dropped here;
      // storage also forces status: pending. That's defense in depth.
      const raw = (input ?? {}) as Partial<TaskCreateInput> & Record<string, unknown>;
      const subject = typeof raw.subject === "string" ? raw.subject : "";
      const description = typeof raw.description === "string" ? raw.description : "";
      const activeForm = typeof raw.activeForm === "string" ? raw.activeForm : undefined;

      const sanitized: TaskCreateInput = {
        subject,
        description,
        ...(activeForm !== undefined ? { activeForm } : {}),
      };

      if (!Value.Check(TaskCreateParams, sanitized)) {
        return {
          content: [{ type: "text", text: "task_create: invalid input" }],
          details: { taskId: "", subject: "" },
        };
      }

      const taskListId = getTaskListId(ctx);
      const taskId = await createTask(taskListId, sanitized, root);

      await refreshWidget({ ctx, taskListId, toolName: name, brand, headerPrefix, root });

      void writeMarker("task-event", { kind: "create", taskId, subject: sanitized.subject });
      (ctx.sessionManager as SessionManager).appendCustomEntry("task-event", {
        kind: "create",
        taskId,
        subject: sanitized.subject,
      });

      return {
        content: [{ type: "text", text: `Task #${taskId} created successfully: ${sanitized.subject}` }],
        details: { taskId, subject: sanitized.subject },
      };
    },
  });
}
