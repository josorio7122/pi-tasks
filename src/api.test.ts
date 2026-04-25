import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { createTasksTools, registerTasksTools } from "./api.js";

describe("createTasksTools", () => {
  it("returns four tool defs with default names", () => {
    const tools = createTasksTools();
    expect(tools.create.name).toBe("task_create");
    expect(tools.update.name).toBe("task_update");
    expect(tools.list.name).toBe("task_list");
    expect(tools.get.name).toBe("task_get");
  });

  it("applies namePrefix consistently", () => {
    const tools = createTasksTools({ namePrefix: "plan" });
    expect(tools.create.name).toBe("plan_create");
    expect(tools.update.name).toBe("plan_update");
    expect(tools.list.name).toBe("plan_list");
    expect(tools.get.name).toBe("plan_get");
  });

  it("applies labelPrefix consistently", () => {
    const tools = createTasksTools({ labelPrefix: "Plan" });
    expect(tools.create.label).toBe("Plan Create");
    expect(tools.update.label).toBe("Plan Update");
    expect(tools.list.label).toBe("Plan List");
    expect(tools.get.label).toBe("Plan Get");
  });
});

describe("registerTasksTools", () => {
  it("registers all four tools on pi.registerTool", () => {
    const registerTool = vi.fn();
    const pi = { registerTool, on: vi.fn(), appendEntry: vi.fn() } as unknown as ExtensionAPI;
    registerTasksTools(pi);
    expect(registerTool).toHaveBeenCalledTimes(4);
  });
});
