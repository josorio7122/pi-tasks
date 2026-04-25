import { describe, expect, it } from "vitest";
import { CREATE_DESCRIPTION, CREATE_PROMPT } from "./create.js";

describe("task_create prompt", () => {
  it("description is the V2 short string", () => {
    expect(CREATE_DESCRIPTION).toBe("Create a new task in the task list");
  });

  it("prompt explains when to use", () => {
    expect(CREATE_PROMPT).toMatch(/When to Use This Tool/);
    expect(CREATE_PROMPT).toMatch(/Complex multi-step tasks/);
  });

  it("prompt explains when NOT to use (anti-pollution guard)", () => {
    expect(CREATE_PROMPT).toMatch(/When NOT to Use This Tool/);
    expect(CREATE_PROMPT).toMatch(/single, straightforward task/i);
    expect(CREATE_PROMPT).toMatch(/less than 3 trivial steps/i);
  });

  it("documents subject + description + activeForm fields", () => {
    expect(CREATE_PROMPT).toMatch(/subject/);
    expect(CREATE_PROMPT).toMatch(/description/);
    expect(CREATE_PROMPT).toMatch(/activeForm/);
  });

  it("notes pending status invariant", () => {
    expect(CREATE_PROMPT).toMatch(/All tasks are created with status `pending`/);
  });

  it("does not reference swarm features", () => {
    expect(CREATE_PROMPT).not.toMatch(/teammate/i);
    expect(CREATE_PROMPT).not.toMatch(/swarm/i);
    expect(CREATE_PROMPT).not.toMatch(/owner/i);
  });
});
