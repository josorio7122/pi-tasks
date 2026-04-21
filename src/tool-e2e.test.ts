import { describe, expect, it } from "vitest";
import { runPiE2EWithRetry } from "./common/e2e-runner.js";

const PI_BIN = process.env.PI_BIN;
const describeIfPi = PI_BIN ? describe : describe.skip;

describeIfPi("tool e2e: add action", () => {
  it("task add triggers task-action + widget-set markers", async () => {
    const result = await runPiE2EWithRetry(
      {
        prompt:
          'You MUST call the task tool with action "add", content "Wire up auth", and activeForm "Wiring up auth". Then reply OK.',
        timeoutMs: 120_000,
      },
      {
        attempts: 3,
        check: (r) =>
          r.markers.some(
            (m) => m.name === "task-action" && (m.payload as { transition: string }).transition === "added",
          ),
      },
    );
    try {
      const action = result.markers.find((m) => m.name === "task-action");
      expect(action).toBeDefined();
      expect((action?.payload as { action: string }).action).toBe("add");
      expect((action?.payload as { transition: string }).transition).toBe("added");
      expect((action?.payload as { taskCount: number }).taskCount).toBe(1);

      const widget = result.markers.find((m) => m.name === "widget-set");
      expect(widget).toBeDefined();
      expect((widget?.payload as { lineCount: number }).lineCount).toBeGreaterThan(0);
    } finally {
      await result.cleanup();
    }
  }, 360_000);
});
