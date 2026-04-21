import { describe, expect, it } from "vitest";
import { formatElapsed } from "./elapsed.js";

describe("formatElapsed", () => {
  it.each([
    [42_000, "42s"],
    [0, "0s"],
    [-500, "0s"],
    [3 * 60_000 + 12_000, "3m 12s"],
    [1 * 3600_000 + 4 * 60_000, "1h 4m"],
  ])("formatElapsed(%d) = %s", (ms, expected) => {
    expect(formatElapsed(ms)).toBe(expected);
  });
});
