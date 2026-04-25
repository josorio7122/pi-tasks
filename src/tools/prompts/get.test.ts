import { describe, expect, it } from "vitest";
import { GET_DESCRIPTION, GET_PROMPT } from "./get.js";

describe("task_get prompt", () => {
  it("description is V2 short string", () => {
    expect(GET_DESCRIPTION).toBe("Get a task by ID from the task list");
  });

  it("explains when to use", () => {
    expect(GET_PROMPT).toMatch(/full description/i);
  });

  it("does not reference dependencies", () => {
    expect(GET_PROMPT).not.toMatch(/blockedBy/i);
    expect(GET_PROMPT).not.toMatch(/\bblocks\b/i);
  });
});
