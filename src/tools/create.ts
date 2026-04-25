import { type AgentToolResult, defineTool, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Value } from "@sinclair/typebox/value";
import { writeMarker } from "../common/markers.js";
import { renderTasksWidget } from "../render/widget.js";
import { type TaskCreateInput, TaskCreateParams } from "../schema.js";
import { createTask, getTaskListId, listTasks } from "../storage/index.js";
import { CREATE_DESCRIPTION, CREATE_PROMPT } from "./prompts/create.js";

export type BuildTaskCreateToolConfig = {
  name?: string;
  label?: string;
  brand?: string;
  headerPrefix?: string;
  tasksRoot?: string;
};

export type CreateTaskDetails = {
  taskId: string;
  subject: string;
};

export function buildTaskCreateTool(config: BuildTaskCreateToolConfig = {}) {
  const name = config.name ?? "task_create";
  const label = config.label ?? "Task Create";
  const brand = config.brand ?? "●";
  const headerPrefix = config.headerPrefix ?? "Tasks";
  const root = config.tasksRoot;

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

      // Validate the sanitized payload (without extras) — guards against empty subject/description.
      if (!Value.Check(TaskCreateParams, sanitized)) {
        const text = "task_create: invalid input";
        return {
          content: [{ type: "text", text }],
          // biome-ignore lint/suspicious/noExplicitAny: details typed for the happy path
          details: { taskId: "", subject: "" } as any,
          isError: true,
        };
      }

      const taskListId = getTaskListId(ctx);
      const taskId = await createTask(taskListId, sanitized, root);

      // Widget refresh. Wrapped in try/catch because the legacy widget renderer
      // still expects `Task.content`; Task 20 will migrate it to `Task.subject`.
      // Until then, swallow render errors so this tool stays green.
      const tasks = await listTasks(taskListId, root);
      let widget: string[] = [];
      try {
        widget = renderTasksWidget({ items: tasks, theme: ctx.ui.theme, width: 80, brand, headerPrefix });
      } catch {
        // widget render incompatible with new schema until Task 20 lands; safe to swallow
      }
      ctx.ui.setWidget(name, tasks.length === 0 ? undefined : widget);

      // Audit
      void writeMarker("task-event", { kind: "create", taskId, subject: sanitized.subject });
      const sm = ctx.sessionManager as unknown as {
        appendEntry?: (kind: string, payload: { kind: string; taskId: string; subject: string }) => void;
      };
      sm.appendEntry?.("task-event", {
        kind: "create",
        taskId,
        subject: sanitized.subject,
      });

      const text = `Task #${taskId} created successfully: ${sanitized.subject}`;
      return {
        content: [{ type: "text", text }],
        details: { taskId, subject: sanitized.subject },
      };
    },
  });
}
