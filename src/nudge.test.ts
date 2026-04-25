import { describe, expect, it } from "vitest";
import { DEFAULT_VERIFICATION_NUDGE, resolveNudge, shouldEmitNudge } from "./nudge.js";
import type { Task } from "./schema.js";

// biome-ignore lint/complexity/useMaxParams: compact test factory for readability
const t = (id: string, subject: string, status: Task["status"] = "completed"): Task => ({
  id,
  subject,
  description: subject,
  status,
});

describe("shouldEmitNudge", () => {
  it("false when fewer than 3 tasks", () => {
    expect(shouldEmitNudge({ allTasks: [t("1", "a"), t("2", "b")], inherited: false })).toBe(false);
  });

  it("false when not all completed", () => {
    expect(
      shouldEmitNudge({
        allTasks: [t("1", "a"), t("2", "b"), t("3", "c", "in_progress")],
        inherited: false,
      }),
    ).toBe(false);
  });

  it("false when any subject contains 'verif' (case-insensitive)", () => {
    expect(
      shouldEmitNudge({
        allTasks: [t("1", "a"), t("2", "Run verification"), t("3", "c")],
        inherited: false,
      }),
    ).toBe(false);
  });

  it("false when running in subagent (inherited env)", () => {
    expect(shouldEmitNudge({ allTasks: [t("1", "a"), t("2", "b"), t("3", "c")], inherited: true })).toBe(false);
  });

  it("true when 3+ all completed, no verif, parent process", () => {
    expect(shouldEmitNudge({ allTasks: [t("1", "a"), t("2", "b"), t("3", "c")], inherited: false })).toBe(true);
  });
});

describe("resolveNudge", () => {
  it("returns DEFAULT text when config is true or undefined", () => {
    expect(resolveNudge(undefined, "verifier")).toBe(DEFAULT_VERIFICATION_NUDGE("verifier"));
    expect(resolveNudge(true, "verifier")).toBe(DEFAULT_VERIFICATION_NUDGE("verifier"));
  });

  it("returns null when config is false", () => {
    expect(resolveNudge(false, "verifier")).toBeNull();
  });

  it("returns the override string when given", () => {
    expect(resolveNudge("custom text", "verifier")).toBe("custom text");
  });

  it("substitutes verifier name into default text", () => {
    const text = DEFAULT_VERIFICATION_NUDGE("my-verifier");
    expect(text).toContain('subagent(agent: "my-verifier"');
  });
});
