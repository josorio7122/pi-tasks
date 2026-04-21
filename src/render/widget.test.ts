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

  it("truncates long rows to width", () => {
    const items: Task[] = [{ id: "1", content: "x".repeat(200), status: "pending" }];
    const lines = renderTasksWidget({ items, theme, width: 50 });
    for (const line of lines) expect(visibleWidth(line)).toBeLessThanOrEqual(50);
  });
});
