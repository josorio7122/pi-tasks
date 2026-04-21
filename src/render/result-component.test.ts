import { describe, expect, it } from "vitest";
import { makeMockTheme } from "../test/mock-theme.js";
import { renderTasksCallComponent, renderTasksErrorComponent, renderTasksResultComponent } from "./result-component.js";

const theme = makeMockTheme();

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

function rendered(c: { render: (w: number) => string[] }, width = 80) {
  return c
    .render(width)
    .map((line) => strip(line).trimEnd())
    .join("\n");
}

describe("renderTasksResultComponent", () => {
  it("formats Task(subject: transition) when subject is set", () => {
    const c = renderTasksResultComponent({ subject: "Wire up auth", transition: "completed", theme });
    expect(rendered(c)).toBe("Task(Wire up auth: completed)");
  });

  it("formats Task(transition) when subject is omitted", () => {
    const c = renderTasksResultComponent({ transition: "cleared", theme });
    expect(rendered(c)).toBe("Task(cleared)");
  });
});

describe("renderTasksErrorComponent", () => {
  it("formats Task(message: error)", () => {
    const c = renderTasksErrorComponent({ message: "no prior tasks", theme });
    expect(rendered(c)).toBe("Task(no prior tasks: error)");
  });
});

describe("renderTasksCallComponent", () => {
  it("shows pending call as Task(action: …)", () => {
    const c = renderTasksCallComponent({ action: "add", theme });
    expect(rendered(c)).toBe("Task(add: …)");
  });
});
