import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import {
  TaskCreateParams,
  TaskGetParams,
  TaskListParams,
  TaskSchema,
  TaskStatusSchema,
  TaskUpdateParams,
  TaskUpdateStatusSchema,
} from "./schema.js";

describe("TaskStatusSchema", () => {
  it("accepts the three live statuses", () => {
    for (const s of ["pending", "in_progress", "completed"]) {
      expect(Value.Check(TaskStatusSchema, s)).toBe(true);
    }
  });

  it("rejects deleted (only allowed via update)", () => {
    expect(Value.Check(TaskStatusSchema, "deleted")).toBe(false);
  });
});

describe("TaskUpdateStatusSchema", () => {
  it("accepts deleted", () => {
    expect(Value.Check(TaskUpdateStatusSchema, "deleted")).toBe(true);
  });
});

describe("TaskSchema", () => {
  it("accepts a minimal task", () => {
    expect(
      Value.Check(TaskSchema, {
        id: "1",
        subject: "Build login flow",
        description: "Wire credential check.",
        status: "pending",
      }),
    ).toBe(true);
  });

  it("rejects extra fields", () => {
    expect(
      Value.Check(TaskSchema, {
        id: "1",
        subject: "x",
        description: "y",
        status: "pending",
        rogue: true,
      }),
    ).toBe(false);
  });

  it("rejects empty subject", () => {
    expect(
      Value.Check(TaskSchema, {
        id: "1",
        subject: "",
        description: "y",
        status: "pending",
      }),
    ).toBe(false);
  });
});

describe("TaskCreateParams", () => {
  it("accepts subject + description", () => {
    expect(Value.Check(TaskCreateParams, { subject: "x", description: "y" })).toBe(true);
  });

  it("rejects status field (server forces pending)", () => {
    expect(
      Value.Check(TaskCreateParams, {
        subject: "x",
        description: "y",
        status: "completed",
      }),
    ).toBe(false);
  });

  it("rejects missing subject", () => {
    expect(Value.Check(TaskCreateParams, { description: "y" })).toBe(false);
  });
});

describe("TaskUpdateParams", () => {
  it("accepts taskId only", () => {
    expect(Value.Check(TaskUpdateParams, { taskId: "1" })).toBe(true);
  });

  it("accepts status: deleted", () => {
    expect(Value.Check(TaskUpdateParams, { taskId: "1", status: "deleted" })).toBe(true);
  });

  it("rejects unknown fields", () => {
    expect(Value.Check(TaskUpdateParams, { taskId: "1", owner: "alice" })).toBe(false);
  });
});

describe("TaskListParams / TaskGetParams", () => {
  it("list rejects any field", () => {
    expect(Value.Check(TaskListParams, {})).toBe(true);
    expect(Value.Check(TaskListParams, { foo: 1 })).toBe(false);
  });

  it("get requires taskId", () => {
    expect(Value.Check(TaskGetParams, { taskId: "1" })).toBe(true);
    expect(Value.Check(TaskGetParams, {})).toBe(false);
  });
});
