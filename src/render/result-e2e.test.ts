import { describe, expect, it } from "vitest";
import { runPiE2EWithRetry } from "../common/e2e-runner.js";

const PI_BIN = process.env.PI_BIN;
const describeIfPi = PI_BIN ? describe : describe.skip;

describeIfPi("result e2e: error on empty session", () => {
  it("complete on empty session emits task-error marker", async () => {
    const result = await runPiE2EWithRetry(
      {
        prompt: 'Call the task tool with action "complete" and id "does-not-exist". Then reply OK.',
        timeoutMs: 120_000,
      },
      {
        attempts: 3,
        check: (r) => r.markers.some((m) => m.name === "task-error"),
      },
    );
    try {
      const err = result.markers.find((m) => m.name === "task-error");
      expect(err).toBeDefined();
      const msg = (err?.payload as { message: string }).message;
      expect(msg).toContain("no prior tasks");
    } finally {
      await result.cleanup();
    }
  }, 360_000);
});
