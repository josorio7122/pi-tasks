import { type Static, Type } from "@sinclair/typebox";

/** Live task statuses. `deleted` only valid on TaskUpdate. */
export const TaskStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("in_progress"),
  Type.Literal("completed"),
]);
export type TaskStatus = Static<typeof TaskStatusSchema>;

/** Status enum on update accepts an extra "deleted" sentinel that triggers task removal. */
export const TaskUpdateStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("in_progress"),
  Type.Literal("completed"),
  Type.Literal("deleted"),
]);
export type TaskUpdateStatus = Static<typeof TaskUpdateStatusSchema>;

/** On-disk shape of one task. */
export const TaskSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    subject: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    activeForm: Type.Optional(Type.String({ minLength: 1 })),
    status: TaskStatusSchema,
    startedAt: Type.Optional(Type.Number()),
  },
  { additionalProperties: false },
);
export type Task = Static<typeof TaskSchema>;

/** task_create input — server forces status: pending regardless of input. */
export const TaskCreateParams = Type.Object(
  {
    subject: Type.String({
      minLength: 1,
      description: "Brief, actionable title in imperative form (e.g. 'Fix authentication bug')",
    }),
    description: Type.String({
      minLength: 1,
      description: "What needs to be done",
    }),
    activeForm: Type.Optional(
      Type.String({
        minLength: 1,
        description:
          "Present continuous form shown in the spinner when the task is in_progress (e.g. 'Fixing authentication bug')",
      }),
    ),
  },
  { additionalProperties: false },
);
export type TaskCreateInput = Static<typeof TaskCreateParams>;

/** task_update input — taskId required, all other fields optional and merged onto disk. */
export const TaskUpdateParams = Type.Object(
  {
    taskId: Type.String({ minLength: 1, description: "ID of the task to update" }),
    subject: Type.Optional(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String({ minLength: 1 })),
    activeForm: Type.Optional(Type.String({ minLength: 1 })),
    status: Type.Optional(TaskUpdateStatusSchema),
  },
  { additionalProperties: false },
);
export type TaskUpdateInput = Static<typeof TaskUpdateParams>;

export const TaskListParams = Type.Object({}, { additionalProperties: false });

export const TaskGetParams = Type.Object({ taskId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
