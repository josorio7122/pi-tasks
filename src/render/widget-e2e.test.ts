import { describe, expect, it } from "vitest";
import { runPiE2EWithRetry } from "../common/e2e-runner.js";

const PI_BIN = process.env.PI_BIN;
const describeIfPi = PI_BIN ? describe : describe.skip;

describeIfPi("widget e2e: in_progress transition", () => {
  it("replace then update→in_progress emits two widget-set markers", async () => {
    const result = await runPiE2EWithRetry(
      {
        prompt:
          'Call the task tool TWICE: first with action "replace" and items ' +
          '[{"id":"1","content":"Write tests","activeForm":"Writing tests","status":"pending"}]. ' +
          'Then call it again with action "update", id "1", status "in_progress". Finally reply OK.',
        timeoutMs: 180_000,
      },
      {
        attempts: 3,
        check: (r) => r.markers.filter((m) => m.name === "task-action").length >= 2,
      },
    );
    try {
      const widgets = result.markers.filter((m) => m.name === "widget-set");
      expect(widgets.length).toBeGreaterThanOrEqual(2);

      const started = result.markers.find(
        (m) => m.name === "task-action" && (m.payload as { transition: string }).transition === "started",
      );
      expect(started).toBeDefined();
    } finally {
      await result.cleanup();
    }
  }, 360_000);
});
