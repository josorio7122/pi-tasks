import { describe, expect, it } from "vitest";
import type { Task, TaskStatus } from "../schema.js";
import { makeMockTheme } from "../test/mock-theme.js";
import { BRANCH, BULLET, branch, bullet, checkbox, indent, styleTaskContent } from "./tree.js";

const theme = makeMockTheme();

describe("checkbox", () => {
  it.each([
    ["pending", "◼"],
    ["in_progress", "◼"],
    ["completed", "✓"],
  ] as const)("glyph for %s is %s", (status, glyph) => {
    expect(checkbox(status as TaskStatus, theme)).toBe(glyph);
  });
  it.each([
    ["pending", "muted"],
    ["in_progress", "text"],
    ["completed", "success"],
  ] as const)("wraps %s via theme.fg(%s, …)", (status, slot) => {
    const calls: string[] = [];
    const colored = {
      ...theme,
      fg: (c: unknown, s: string) => {
        calls.push(String(c));
        return s;
      },
    } as typeof theme;
    checkbox(status as TaskStatus, colored);
    expect(calls).toEqual([slot]);
  });
});

describe("bullet / branch / indent glyphs", () => {
  it("BULLET is ●", () => expect(BULLET).toBe("●"));
  it("BRANCH is ⎿", () => expect(BRANCH).toBe("⎿"));
  it("bullet composes label with ●", () => {
    expect(bullet({ label: "x", theme })).toBe("● x");
  });

  it("branch composes text with default 2-space indent + ⎿", () => {
    expect(branch({ text: "x", theme })).toBe("  ⎿  x");
  });

  it("indent pads each line", () => {
    expect(indent("a\nb", 3)).toBe("   a\n   b");
  });
});

describe("styleTaskContent", () => {
  const sample = (status: TaskStatus): Task => ({ id: "1", subject: "hi", description: "hi", status });

  it("passes through pending", () => {
    expect(styleTaskContent(sample("pending"), theme)).toBe("hi");
  });

  it("wraps in_progress via fg(accent)", () => {
    const t = { ...theme, fg: (_c: unknown, s: string) => `<a>${s}</a>` } as typeof theme;
    expect(styleTaskContent(sample("in_progress"), t)).toBe("<a>hi</a>");
  });

  it("dims + strikes completed", () => {
    const t = {
      ...theme,
      fg: (c: unknown, s: string) => (c === "dim" ? `<d>${s}</d>` : s),
      strikethrough: (s: string) => `<s>${s}</s>`,
    } as typeof theme;
    expect(styleTaskContent(sample("completed"), t)).toBe("<d><s>hi</s></d>");
  });
});
