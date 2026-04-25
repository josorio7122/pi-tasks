import { describe, expect, it } from "vitest";
import { UPDATE_DESCRIPTION, UPDATE_PROMPT } from "./update.js";

describe("task_update prompt", () => {
  it("description is the V2 short string", () => {
    expect(UPDATE_DESCRIPTION).toBe("Update a task in the task list");
  });

  it("contains the V2 completion-guard block (load-bearing)", () => {
    expect(UPDATE_PROMPT).toMatch(/ONLY mark a task as completed when you have FULLY accomplished it/);
    expect(UPDATE_PROMPT).toMatch(/Tests are failing/);
    expect(UPDATE_PROMPT).toMatch(/Implementation is partial/);
    expect(UPDATE_PROMPT).toMatch(/missing files or dependencies/i);
  });

  it("documents pending → in_progress → completed workflow", () => {
    expect(UPDATE_PROMPT).toMatch(/pending.*in_progress.*completed/);
  });

  it("explains deleted as removal sentinel", () => {
    expect(UPDATE_PROMPT).toMatch(/`deleted` to permanently remove/);
  });

  it("includes example JSON calls", () => {
    expect(UPDATE_PROMPT).toMatch(/"taskId": "1", "status": "in_progress"/);
  });

  it("does not reference swarm fields", () => {
    expect(UPDATE_PROMPT).not.toMatch(/owner/i);
    expect(UPDATE_PROMPT).not.toMatch(/blockedBy/i);
    expect(UPDATE_PROMPT).not.toMatch(/blocks/i);
  });
});
