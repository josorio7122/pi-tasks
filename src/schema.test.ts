import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import {
  type Task,
  TaskActionSchema,
  TaskDetailsSchema,
  TaskSchema,
  TaskStatusSchema,
  TaskToolParamsSchema,
} from "./schema.js";

describe("TaskSchema", () => {
  it("accepts a minimal valid task", () => {
    const t: Task = { id: "1", content: "Build X", status: "pending" };
    expect(Value.Check(TaskSchema, t)).toBe(true);
  });
  it("accepts a fully populated task", () => {
    const t: Task = {
      id: "1",
      content: "Build X",
      status: "in_progress",
      activeForm: "Building X",
      startedAt: 1_700_000_000_000,
    };
    expect(Value.Check(TaskSchema, t)).toBe(true);
  });
  it("rejects empty id", () => {
    expect(Value.Check(TaskSchema, { id: "", content: "x", status: "pending" })).toBe(false);
  });
  it("rejects empty content", () => {
    expect(Value.Check(TaskSchema, { id: "1", content: "", status: "pending" })).toBe(false);
  });
});

describe("TaskStatusSchema", () => {
  it.each(["pending", "in_progress", "completed"])("accepts valid status %s", (s) => {
    expect(Value.Check(TaskStatusSchema, s)).toBe(true);
  });
  it("rejects unknown status", () => {
    expect(Value.Check(TaskStatusSchema, "done")).toBe(false);
  });
});

describe("TaskActionSchema", () => {
  it("accepts list/clear without extras", () => {
    expect(Value.Check(TaskActionSchema, { action: "list" })).toBe(true);
    expect(Value.Check(TaskActionSchema, { action: "clear" })).toBe(true);
  });
  it("accepts add with activeForm", () => {
    expect(
      Value.Check(TaskActionSchema, {
        action: "add",
        content: "Build X",
        activeForm: "Building X",
      }),
    ).toBe(true);
  });
  it("accepts update with status transition", () => {
    expect(
      Value.Check(TaskActionSchema, {
        action: "update",
        id: "1",
        status: "in_progress",
      }),
    ).toBe(true);
  });
});

describe("TaskDetailsSchema", () => {
  it("accepts { tasks: [], action }", () => {
    expect(Value.Check(TaskDetailsSchema, { tasks: [], action: "list" })).toBe(true);
  });
});

describe("TaskToolParamsSchema", () => {
  it("is a top-level type:object (OpenAI function-calling requirement)", () => {
    expect(Value.Check(TaskToolParamsSchema, { action: "list" })).toBe(true);
    expect(Value.Check(TaskToolParamsSchema, { action: "add", content: "x" })).toBe(true);
  });
});
