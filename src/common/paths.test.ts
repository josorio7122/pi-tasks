import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getTaskPath,
  getTasksDir,
  highWaterMarkPath,
  lockFilePath,
  packageRoot,
  sanitizePathComponent,
  tasksRoot,
} from "./paths.js";

describe("sanitizePathComponent", () => {
  it("keeps allowed chars", () => {
    expect(sanitizePathComponent("abc-123_X")).toBe("abc-123_X");
  });

  it("replaces forbidden chars with hyphen", () => {
    expect(sanitizePathComponent("a/b\\c.d e")).toBe("a-b-c-d-e");
  });

  it("replaces empty / unicode to keep filesystem safety", () => {
    expect(sanitizePathComponent("séssion id")).toBe("s-ssion-id");
  });
});

describe("path layout", () => {
  it("tasksRoot defaults to ~/.pi/agent/tasks", () => {
    expect(tasksRoot()).toBe(join(homedir(), ".pi", "agent", "tasks"));
  });

  it("tasksRoot honors override", () => {
    expect(tasksRoot("/tmp/pt")).toBe("/tmp/pt");
  });

  it("getTasksDir composes root + sanitized id", () => {
    expect(getTasksDir("abc def", "/tmp/pt")).toBe("/tmp/pt/abc-def");
  });

  it("getTaskPath uses <id>.json", () => {
    expect(getTaskPath("sess", "42", "/tmp/pt")).toBe("/tmp/pt/sess/42.json");
  });

  it("lockFilePath uses .lock", () => {
    expect(lockFilePath("sess", "/tmp/pt")).toBe("/tmp/pt/sess/.lock");
  });

  it("highWaterMarkPath uses .highwatermark (V2 verbatim)", () => {
    expect(highWaterMarkPath("sess", "/tmp/pt")).toBe("/tmp/pt/sess/.highwatermark");
  });

  it("packageRoot resolves to repo root containing package.json", () => {
    expect(existsSync(join(packageRoot(), "package.json"))).toBe(true);
  });
});
