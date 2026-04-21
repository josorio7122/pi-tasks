import { visibleWidth } from "@mariozechner/pi-tui";
import { describe, expect, it } from "vitest";
import type { Task } from "../schema.js";
import { makeMockTheme } from "../test/mock-theme.js";
import { renderTasksWidget } from "./widget.js";

const theme = makeMockTheme();

function sample(): Task[] {
  return [
    { id: "1", content: "a", status: "completed" },
    { id: "2", content: "b", status: "pending" },
  ];
}

describe("renderTasksWidget", () => {
  it("returns [] for empty items", () => {
    expect(renderTasksWidget({ items: [], theme, width: 80 })).toEqual([]);
  });

  it("falls back to count header when no task is in_progress", () => {
    const lines = renderTasksWidget({ items: sample(), theme, width: 80 });
    expect(lines[0]).toContain("Tasks");
    expect(lines[0]).toContain("1/2 done");
  });

  it("renders activeForm + elapsed in header when one task is in_progress", () => {
    const now = 100_000;
    const items: Task[] = [
      { id: "1", content: "Build", activeForm: "Building", status: "in_progress", startedAt: now - 42_000 },
    ];
    const lines = renderTasksWidget({ items, theme, width: 80, now });
    expect(lines[0]).toContain("Building");
    expect(lines[0]).toContain("(42s)");
  });

  it("falls back to content when activeForm is missing", () => {
    const items: Task[] = [{ id: "1", content: "Build", status: "in_progress" }];
    const lines = renderTasksWidget({ items, theme, width: 80, now: 100_000 });
    expect(lines[0]).toContain("Build…");
  });

  it("applies custom brand and headerPrefix via config", () => {
    const lines = renderTasksWidget({
      items: [{ id: "1", content: "a", status: "pending" }],
      theme,
      width: 80,
      brand: "🧪",
      headerPrefix: "Todo",
    });
    expect(lines[0]).toContain("🧪");
    expect(lines[0]).toContain("Todo");
  });

  it("shows aggregate 'N running' header when multiple tasks are in_progress", () => {
    const now = 100_000;
    const items: Task[] = [
      { id: "1", content: "A", activeForm: "Doing A", status: "in_progress", startedAt: now - 5_000 },
      { id: "2", content: "B", activeForm: "Doing B", status: "in_progress", startedAt: now - 2_000 },
      { id: "3", content: "C", status: "pending" },
    ];
    const lines = renderTasksWidget({ items, theme, width: 80, now });
    expect(lines[0]).toContain("2 running");
    expect(lines[0]).toContain("0/3 done");
    expect(lines[0]).not.toContain("Doing A");
    expect(lines[0]).not.toContain("Doing B");
    expect(lines).toHaveLength(1 + 3);
  });

  it("still renders one row per task when multiple are in_progress", () => {
    const items: Task[] = [
      { id: "1", content: "A", status: "in_progress", startedAt: 0 },
      { id: "2", content: "B", status: "in_progress", startedAt: 0 },
    ];
    const lines = renderTasksWidget({ items, theme, width: 80, now: 10_000 });
    expect(lines).toHaveLength(1 + 2);
    expect(lines[1]).toContain("A");
    expect(lines[2]).toContain("B");
  });

  it("truncates long rows to width", () => {
    const items: Task[] = [{ id: "1", content: "x".repeat(200), status: "pending" }];
    const lines = renderTasksWidget({ items, theme, width: 50 });
    for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(50);
  });
});
