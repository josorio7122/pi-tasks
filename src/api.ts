import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { NudgeConfig } from "./nudge.js";
import { ENV_SNAPSHOT_AT_LOAD, isInheritedTaskListId } from "./storage/index.js";
import { buildTaskCreateTool } from "./tools/create.js";
import { buildTaskGetTool } from "./tools/get.js";
import { buildTaskListTool } from "./tools/list.js";
import { pickDefined } from "./tools/shared.js";
import { buildTaskUpdateTool } from "./tools/update.js";

export type CreateTasksToolsConfig = {
  /** Default "task" → tools become task_create, task_update, task_list, task_get. */
  namePrefix?: string;
  /** Default "Task" → labels: "Task Create", "Task Update", ... */
  labelPrefix?: string;
  /** Widget brand glyph. Default "●". */
  brand?: string;
  /** Widget header label. Default "Tasks". */
  headerPrefix?: string;
  /** Verification nudge: true=default text, string=override, false=disable. Default true. */
  verificationNudge?: NudgeConfig;
  /** Verifier subagent name embedded in default nudge text. Default "verifier". */
  verifierAgentName?: string;
  /** Override the storage root. Default ~/.pi/agent/tasks. */
  tasksRoot?: string;
};

function namesFromConfig(config: CreateTasksToolsConfig) {
  const np = config.namePrefix ?? "task";
  const lp = config.labelPrefix ?? "Task";
  return {
    create: { name: `${np}_create`, label: `${lp} Create` },
    update: { name: `${np}_update`, label: `${lp} Update` },
    list: { name: `${np}_list`, label: `${lp} List` },
    get: { name: `${np}_get`, label: `${lp} Get` },
  };
}

export function createTasksTools(config: CreateTasksToolsConfig = {}) {
  const names = namesFromConfig(config);
  const inherited = isInheritedTaskListId({ envSnapshot: ENV_SNAPSHOT_AT_LOAD });
  // pickDefined drops undefined keys so we don't trip exactOptionalPropertyTypes
  // when spreading into tool factories (their fields are optional, not optional|undefined).
  const common = pickDefined({
    brand: config.brand,
    headerPrefix: config.headerPrefix,
    tasksRoot: config.tasksRoot,
  });

  const updateExtras = pickDefined({
    verificationNudge: config.verificationNudge,
    verifierAgentName: config.verifierAgentName,
  });

  return {
    create: buildTaskCreateTool({ ...common, ...names.create }),
    update: buildTaskUpdateTool({
      ...common,
      ...names.update,
      inheritedTaskListId: inherited,
      ...updateExtras,
    }),
    list: buildTaskListTool({ ...common, ...names.list }),
    get: buildTaskGetTool({ ...common, ...names.get }),
  };
}

export function registerTasksTools(pi: ExtensionAPI, config: CreateTasksToolsConfig = {}): void {
  const tools = createTasksTools(config);
  pi.registerTool(tools.create);
  pi.registerTool(tools.update);
  pi.registerTool(tools.list);
  pi.registerTool(tools.get);
}

export { formatElapsed } from "./render/elapsed.js";
export type { RenderTasksWidgetProps } from "./render/widget.js";
export { renderTasksWidget } from "./render/widget.js";
export type { Task, TaskStatus } from "./schema.js";
export { TaskSchema, TaskStatusSchema } from "./schema.js";
