import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import tasksExtension from "./index.js";

describe("default extension", () => {
  it("registers all 4 tools and subscribes to session_start", () => {
    const registerTool = vi.fn();
    const on = vi.fn();
    const pi = { registerTool, on } as unknown as ExtensionAPI;
    tasksExtension(pi);
    expect(registerTool).toHaveBeenCalledTimes(4);
    const events = on.mock.calls.map((c) => c[0]);
    expect(events).toContain("session_start");
  });
});
