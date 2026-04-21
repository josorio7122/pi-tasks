import { describe, expect, it, vi } from "vitest";
import tasksExtension from "./index.js";

describe("pi-tasks extension factory", () => {
  it("registers a single 'task' tool on the pi ExtensionAPI", () => {
    const registerTool = vi.fn();
    const pi = { registerTool } as never;

    tasksExtension(pi);

    expect(registerTool).toHaveBeenCalledTimes(1);
    const tool = registerTool.mock.calls[0]?.[0];
    expect(tool?.name).toBe("task");
    expect(tool?.label).toBe("Tasks");
    expect(typeof tool?.execute).toBe("function");
    expect(typeof tool?.renderCall).toBe("function");
    expect(typeof tool?.renderResult).toBe("function");
  });

  it("is a synchronous default export matching pi's extension factory signature", () => {
    expect(typeof tasksExtension).toBe("function");
    expect(tasksExtension.constructor.name).toBe("Function");
  });
});
