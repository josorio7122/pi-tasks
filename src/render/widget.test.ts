import { visibleWidth } from "@mariozechner/pi-tui";
import { describe, expect, it } from "vitest";
import type { Task } from "../schema.js";
import { mockTheme } from "../test/mock-theme.js";
import { renderTasksWidget } from "./widget.js";

const theme = mockTheme();

function sample(): Task[] {
  return [
    { id: "1", subject: "a", description: "a", status: "completed" },
    { id: "2", subject: "b", description: "b", status: "pending" },
  ];
}

describe("renderTasksWidget", () => {
  it("returns [] for empty items", () => {
    expect(renderTasksWidget({ items: [], theme, width: 80 })).toEqual([]);
  });

  it("renders V2-parity aggregate header (counts only) when nothing is in_progress", () => {
    const lines = renderTasksWidget({ items: sample(), theme, width: 80 });
    expect(lines[0]).toContain("2 tasks");
    expect(lines[0]).toContain("1 done");
    expect(lines[0]).toContain("1 open");
    expect(lines[0]).not.toContain("in progress");
  });

  it("includes the in-progress count when at least one task is in_progress", () => {
    const items: Task[] = [
      { id: "1", subject: "Build", description: "Build", activeForm: "Building", status: "in_progress" },
      { id: "2", subject: "Test", description: "Test", status: "pending" },
    ];
    const lines = renderTasksWidget({ items, theme, width: 80 });
    expect(lines[0]).toContain("2 tasks");
    expect(lines[0]).toContain("0 done");
    expect(lines[0]).toContain("1 in progress");
    expect(lines[0]).toContain("1 open");
  });

  it("never replaces the header with activeForm — that signal lives on the row, not the title", () => {
    const items: Task[] = [
      { id: "1", subject: "Build", description: "Build", activeForm: "Building", status: "in_progress" },
    ];
    const lines = renderTasksWidget({ items, theme, width: 80 });
    expect(lines[0]).not.toContain("Building…");
    expect(lines[0]).not.toContain("Build…");
  });

  it("never includes a per-task elapsed timer in the header", () => {
    const items: Task[] = [
      {
        id: "1",
        subject: "Build",
        description: "Build",
        activeForm: "Building",
        status: "in_progress",
        startedAt: 0,
      },
    ];
    const lines = renderTasksWidget({ items, theme, width: 80 });
    expect(lines[0]).not.toMatch(/\(\d+s\)/);
  });

  it("applies custom brand", () => {
    const lines = renderTasksWidget({
      items: [{ id: "1", subject: "a", description: "a", status: "pending" }],
      theme,
      width: 80,
      brand: "🧪",
    });
    expect(lines[0]).toContain("🧪");
    expect(lines[0]).toContain("1 tasks");
  });

  it("counts every status independently when multiple tasks are in_progress", () => {
    const items: Task[] = [
      { id: "1", subject: "A", description: "A", activeForm: "Doing A", status: "in_progress" },
      { id: "2", subject: "B", description: "B", activeForm: "Doing B", status: "in_progress" },
      { id: "3", subject: "C", description: "C", status: "pending" },
    ];
    const lines = renderTasksWidget({ items, theme, width: 80 });
    expect(lines[0]).toContain("3 tasks");
    expect(lines[0]).toContain("0 done");
    expect(lines[0]).toContain("2 in progress");
    expect(lines[0]).toContain("1 open");
    expect(lines[0]).not.toContain("Doing A");
    expect(lines[0]).not.toContain("Doing B");
    expect(lines).toHaveLength(1 + 3);
  });

  it("still renders one row per task when multiple are in_progress", () => {
    const items: Task[] = [
      { id: "1", subject: "A", description: "A", status: "in_progress", startedAt: 0 },
      { id: "2", subject: "B", description: "B", status: "in_progress", startedAt: 0 },
    ];
    const lines = renderTasksWidget({ items, theme, width: 80 });
    expect(lines).toHaveLength(1 + 2);
    expect(lines[1]).toContain("A");
    expect(lines[2]).toContain("B");
  });

  it("truncates long rows to width", () => {
    const items: Task[] = [{ id: "1", subject: "x".repeat(200), description: "x".repeat(200), status: "pending" }];
    const lines = renderTasksWidget({ items, theme, width: 50 });
    for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(50);
  });
});
