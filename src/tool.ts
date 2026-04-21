import { type AgentToolResult, defineTool, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Value } from "@sinclair/typebox/value";
import { writeMarker } from "./common/markers.js";
import {
  renderTasksCallComponent,
  renderTasksErrorComponent,
  renderTasksResultComponent,
} from "./render/result-component.js";
import { renderTasksWidget } from "./render/widget.js";
import { type Task, type TaskAction, TaskActionSchema, type TaskDetails, TaskToolParamsSchema } from "./schema.js";
import { applyAction, reconstructTasks } from "./state.js";

export type CreateTasksToolConfig = {
  name?: string;
  label?: string;
  description?: string;
  brand?: string;
  headerPrefix?: string;
};

/** Collapse whitespace runs (newlines, indentation) into single spaces; trim ends. */
const flatten = (s: string): string => s.replace(/\s+/g, " ").trim();

const DEFAULT_DESCRIPTION = flatten(`
  Track session-scoped tasks. Actions: \`add\`, \`replace\`, \`update\`, \`complete\`, \`remove\`, \`clear\`, \`list\`.
  Every task has \`content\` (static imperative form, e.g. 'Build login flow') and \`activeForm\`
  (present-continuous, e.g. 'Building login flow…'). The widget shows activeForm in its header
  while a task is in_progress, so always provide both when adding or updating.
  Discipline: (1) Before starting work on a task, call \`update\` with \`status: 'in_progress'\`.
  (2) Call \`complete\` (or \`update\` with \`status: 'completed'\`) the moment a task is finished — don't batch.
  (3) Break large tasks into smaller sub-tasks if you can't commit to finishing in one go.
  (4) Call \`update\` (flip to in_progress) at the START of your turn, before emitting user-facing text.
  Don't call the tool after you've already emitted text in the same turn — defer it to a later turn.
  This prevents unnecessary restatement on some models.
`);

/** Past-tense verb per action; "update" bifurcates on whether status flipped to in_progress. */
function transitionFor(input: TaskAction): string {
  switch (input.action) {
    case "add":
      return "added";
    case "update":
      return input.status === "in_progress" ? "started" : "updated";
    case "complete":
      return "completed";
    case "remove":
      return "removed";
    case "replace":
      return "replaced";
    case "clear":
      return "cleared";
    case "list":
      return "listed";
  }
}

/** Content of the task affected by the action, or a bulk phrase. Undefined for readonly / empty actions. */
function subjectFor(params: {
  readonly input: TaskAction;
  readonly prior: Task[];
  readonly tasks: Task[];
}): string | undefined {
  const { input, prior, tasks } = params;
  switch (input.action) {
    case "add":
      return tasks.find((t) => !prior.some((p) => p.id === t.id))?.content;
    case "update":
    case "complete":
      return tasks.find((t) => t.id === input.id)?.content;
    case "remove":
      return prior.find((t) => t.id === input.id)?.content;
    case "replace":
      return `${input.items.length} task${input.items.length === 1 ? "" : "s"}`;
    case "clear":
    case "list":
      return undefined;
  }
}

/** Plain-text label — `Task(subject: transition)` or `Task(transition)` when no subject. */
export function formatTaskLabel(subject: string | undefined, transition: string): string {
  return subject !== undefined ? `Task(${subject}: ${transition})` : `Task(${transition})`;
}

export function createTasksTool(config: CreateTasksToolConfig = {}) {
  const name = config.name ?? "task";
  const label = config.label ?? "Tasks";
  const description = config.description ?? DEFAULT_DESCRIPTION;
  const brand = config.brand ?? "●";
  const headerPrefix = config.headerPrefix ?? "Tasks";

  return defineTool({
    name,
    label,
    description,
    parameters: TaskToolParamsSchema,

    // biome-ignore lint/complexity/useMaxParams: pi's ToolDefinition.execute signature is fixed at 5 params
    async execute(
      _toolCallId,
      input,
      _signal,
      _onUpdate,
      ctx: ExtensionContext,
    ): Promise<AgentToolResult<TaskDetails>> {
      const { sessionManager, ui } = ctx;
      const width = 80;

      function errorResult(message: string): AgentToolResult<TaskDetails> {
        void writeMarker("task-error", { message });
        return {
          content: [{ type: "text", text: formatTaskLabel(message, "error") }],
          details: { tasks: [], action: "error", subject: message, transition: "error" },
        };
      }

      if (!Value.Check(TaskActionSchema, input)) {
        return errorResult("invalid input");
      }

      const entries = sessionManager.getEntries() as Parameters<typeof reconstructTasks>[0];
      const prior = reconstructTasks(entries, name);
      const mutating = input.action === "complete" || input.action === "update" || input.action === "remove";
      if (mutating && prior.length === 0) {
        return errorResult("no prior tasks in session — use 'add' or 'replace' first");
      }

      const tasks = applyAction(prior, input);
      const widget = renderTasksWidget({ items: tasks, theme: ui.theme, width, brand, headerPrefix });

      if (tasks.length === 0) ui.setWidget(name, undefined);
      else ui.setWidget(name, widget);

      const transition = transitionFor(input);
      const subject = subjectFor({ input, prior, tasks });

      void writeMarker("widget-set", {
        name,
        ...(tasks.length === 0 ? { cleared: true, lineCount: 0 } : { lineCount: widget.length }),
      });
      void writeMarker("task-action", {
        action: input.action,
        transition,
        ...(subject !== undefined ? { subject } : {}),
        taskCount: tasks.length,
      });

      return {
        content: [{ type: "text", text: formatTaskLabel(subject, transition) }],
        details: { tasks, action: input.action, ...(subject !== undefined ? { subject } : {}), transition },
      };
    },

    // biome-ignore lint/complexity/useMaxParams: pi's ToolDefinition.renderCall signature is fixed
    renderCall(args, theme, _ctx) {
      const action =
        typeof (args as { action?: unknown }).action === "string" ? (args as { action: string }).action : "?";
      return renderTasksCallComponent({ action, theme });
    },

    // biome-ignore lint/complexity/useMaxParams: pi's ToolDefinition.renderResult signature is fixed
    renderResult(result, _opts, theme, _ctx) {
      const details = result.details;
      if (details.action === "error") {
        return renderTasksErrorComponent({ message: details.subject ?? "unknown error", theme });
      }
      return renderTasksResultComponent({
        ...(details.subject !== undefined ? { subject: details.subject } : {}),
        transition: details.transition ?? details.action,
        theme,
      });
    },
  });
}
