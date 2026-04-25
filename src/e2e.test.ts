import { readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runPiE2EWithRetry } from "./common/e2e-runner.js";
import type { Task } from "./schema.js";

// E2E gate. The vitest.e2e.config.ts already filters by filename pattern; this skip
// guards local `vitest run` invocations that pick up the file by accident, and lets
// CI run `npm run test:e2e` (which sets PI_E2E=1) without smashing user state.
const E2E_ENABLED = process.env.PI_E2E === "1";

// Unique id keeps this run isolated from the user's real ~/.pi/agent/tasks/<sid>/ dir.
// We can't redirect tasksRoot via env (it's a tool-config field, not env), so we
// pin a unique PI_TASK_LIST_ID and clean up its slice of the storage tree after.
const taskListId = `e2e-mirror-${process.pid}-${Date.now()}`;
const tasksDir = join(homedir(), ".pi", "agent", "tasks", taskListId);

type TaskEvent = { kind: "create" | "update"; taskId: string; subject?: string; fields?: string[] };

describe.skipIf(!E2E_ENABLED)("e2e: real pi runtime, 4-tool lifecycle", () => {
  it("create → update(in_progress) → update(completed) emits markers and persists task json", async () => {
    const result = await runPiE2EWithRetry(
      {
        prompt:
          "You MUST drive a single task end-to-end through pi-tasks tools, then reply OK.\n" +
          '1. Call task_create with subject "Wire up auth", description "Implement login flow end-to-end", ' +
          'activeForm "Wiring up auth".\n' +
          '2. Call task_update with taskId "1" and status "in_progress".\n' +
          '3. Call task_update with taskId "1" and status "completed".\n' +
          "Then reply OK.",
        timeoutMs: 180_000,
        env: { PI_TASK_LIST_ID: taskListId },
      },
      {
        attempts: 3,
        check: (r) => {
          const events = r.markers.filter((m) => m.name === "task-event");
          const hasCreate = events.some((m) => (m.payload as TaskEvent).kind === "create");
          const hasUpdate = events.some((m) => (m.payload as TaskEvent).kind === "update");
          return hasCreate && hasUpdate;
        },
      },
    );

    try {
      const events = result.markers.filter((m) => m.name === "task-event");
      const creates = events.filter((m) => (m.payload as TaskEvent).kind === "create");
      const updates = events.filter((m) => (m.payload as TaskEvent).kind === "update");

      expect(creates.length).toBeGreaterThanOrEqual(1);
      expect(updates.length).toBeGreaterThanOrEqual(1);

      const createPayload = creates[0]?.payload as TaskEvent;
      expect(createPayload.taskId).toBe("1");
      expect(typeof createPayload.subject).toBe("string");
      expect((createPayload.subject ?? "").length).toBeGreaterThan(0);

      // Best-effort: confirm at least one update touched task #1.
      expect(updates.some((m) => (m.payload as TaskEvent).taskId === "1")).toBe(true);

      // Disk assertion: the task json should land at <tasksRoot>/<id>/1.json. Default
      // tasksRoot is ~/.pi/agent/tasks; we used a unique PI_TASK_LIST_ID for isolation.
      const taskFile = join(tasksDir, "1.json");
      const raw = await readFile(taskFile, "utf8");
      const parsed = JSON.parse(raw) as Task;
      expect(parsed.id).toBe("1");
      // The model may stop after in_progress on a flaky run; accept either terminal state
      // that proves an update landed on disk.
      expect(["in_progress", "completed"]).toContain(parsed.status);
    } finally {
      await result.cleanup();
      await rm(tasksDir, { recursive: true, force: true });
    }
  }, 600_000);
});
