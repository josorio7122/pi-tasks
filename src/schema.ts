import { type Static, Type } from "@sinclair/typebox";

export const TaskStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("in_progress"),
  Type.Literal("completed"),
]);
export type TaskStatus = Static<typeof TaskStatusSchema>;

export const TaskSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  content: Type.String({ minLength: 1 }),
  status: TaskStatusSchema,
  activeForm: Type.Optional(Type.String({ minLength: 1 })),
  startedAt: Type.Optional(Type.Number()),
});
export type Task = Static<typeof TaskSchema>;

export const TaskActionSchema = Type.Union([
  Type.Object({ action: Type.Literal("list") }),
  Type.Object({ action: Type.Literal("clear") }),
  Type.Object({ action: Type.Literal("replace"), items: Type.Array(TaskSchema) }),
  Type.Object({
    action: Type.Literal("add"),
    content: Type.String({ minLength: 1 }),
    activeForm: Type.Optional(Type.String({ minLength: 1 })),
  }),
  Type.Object({
    action: Type.Literal("update"),
    id: Type.String({ minLength: 1 }),
    content: Type.Optional(Type.String({ minLength: 1 })),
    activeForm: Type.Optional(Type.String({ minLength: 1 })),
    status: Type.Optional(TaskStatusSchema),
  }),
  Type.Object({ action: Type.Literal("complete"), id: Type.String({ minLength: 1 }) }),
  Type.Object({ action: Type.Literal("remove"), id: Type.String({ minLength: 1 }) }),
]);
export type TaskAction = Static<typeof TaskActionSchema>;

export const TaskDetailsSchema = Type.Object({
  tasks: Type.Array(TaskSchema),
  action: Type.String(),
  /** Task content affected by the action, or a bulk summary like "3 tasks". Undefined for clear/list/error. */
  subject: Type.Optional(Type.String()),
  /** Past-tense verb describing what happened. e.g. "added", "completed", "started", "replaced". */
  transition: Type.Optional(Type.String()),
});
export type TaskDetails = Static<typeof TaskDetailsSchema>;

const TASK_ACTION_NAMES = ["list", "clear", "replace", "add", "update", "complete", "remove"] as const;

export const TaskToolParamsSchema = Type.Object(
  {
    action: Type.Union(
      TASK_ACTION_NAMES.map((name) => Type.Literal(name)),
      { description: "The action to perform" },
    ),
    items: Type.Optional(Type.Array(TaskSchema, { description: "Required for action=replace" })),
    content: Type.Optional(Type.String({ description: "Required for action=add; optional for action=update" })),
    activeForm: Type.Optional(
      Type.String({
        description:
          "Present-continuous form of content (e.g. 'Building X…' for content 'Build X'). Shown in the widget header while the task is in_progress.",
      }),
    ),
    id: Type.Optional(Type.String({ description: "Required for action=update/complete/remove" })),
    status: Type.Optional(TaskStatusSchema),
  },
  {
    description: "Track session-scoped tasks. Shape of params depends on action field.",
  },
);
