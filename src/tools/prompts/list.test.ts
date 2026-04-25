import { describe, expect, it } from "vitest";
import { LIST_DESCRIPTION, LIST_PROMPT } from "./list.js";

describe("task_list prompt", () => {
  it("description is V2 short string", () => {
    expect(LIST_DESCRIPTION).toBe("List all tasks in the task list");
  });

  it("explains output shape (id, subject, status)", () => {
    expect(LIST_PROMPT).toMatch(/id.*subject.*status/s);
  });

  it("does not reference swarm features", () => {
    expect(LIST_PROMPT).not.toMatch(/teammate/i);
    expect(LIST_PROMPT).not.toMatch(/owner/i);
    expect(LIST_PROMPT).not.toMatch(/blocked/i);
  });
});
