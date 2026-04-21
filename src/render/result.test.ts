import { describe, expect, it } from "vitest";
import { makeMockTheme } from "../test/mock-theme.js";
import { renderTasksError, renderTasksResult } from "./result.js";

const theme = makeMockTheme();

describe("renderTasksResult", () => {
  it("formats Task(subject: transition) when subject is set", () => {
    const [line] = renderTasksResult({ subject: "Wire up auth", transition: "completed", theme });
    expect(line).toBe("Task(Wire up auth: completed)");
  });

  it("formats Task(transition) when subject is omitted (bulk/readonly actions)", () => {
    const [line] = renderTasksResult({ transition: "cleared", theme });
    expect(line).toBe("Task(cleared)");
  });

  it("returns a single-line array", () => {
    const lines = renderTasksResult({ subject: "X", transition: "added", theme });
    expect(lines).toHaveLength(1);
  });
});

describe("renderTasksError", () => {
  it("formats Task(message: error) for errors", () => {
    const [line] = renderTasksError({ message: "no prior tasks", theme });
    expect(line).toBe("Task(no prior tasks: error)");
  });
});
