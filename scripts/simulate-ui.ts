/**
 * Simulates a realistic pi-tasks tool-call session against a temp tasks root.
 * Exercises the v0.2 4-tool flow (createTask + updateTask) and prints the
 * above-editor widget after each step so the visual evolution can be eyeballed.
 *
 * Usage: npm run simulate
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderTasksWidget } from "../src/render/widget.js";
import { createTask, listTasks, updateTask } from "../src/storage/index.js";
import { mockTheme } from "../src/test/mock-theme.js";

const TASK_LIST_ID = "sim";
const WIDTH = process.stdout.columns || 100;

async function renderFrame(label: string, root: string): Promise<void> {
  const tasks = await listTasks(TASK_LIST_ID, root);
  const widget = renderTasksWidget({ items: tasks, theme: mockTheme(), width: WIDTH });
  console.log(`\n=== ${label} ===`);
  if (widget.length === 0) console.log("(empty)");
  else for (const line of widget) console.log(line);
}

async function main(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), "pi-tasks-sim-"));
  try {
    await createTask(
      TASK_LIST_ID,
      { subject: "Set up project", description: "Init repo + deps", activeForm: "Setting up project" },
      root,
    );
    await createTask(
      TASK_LIST_ID,
      { subject: "Wire auth", description: "Build login flow", activeForm: "Wiring auth" },
      root,
    );
    await createTask(
      TASK_LIST_ID,
      { subject: "Open PR", description: "Push + open MR", activeForm: "Opening PR" },
      root,
    );

    await renderFrame("frame 1: three pending tasks", root);

    await updateTask(TASK_LIST_ID, "2", { status: "in_progress" }, root);
    await renderFrame("frame 2: task 2 in_progress (header should show activeForm)", root);

    await updateTask(TASK_LIST_ID, "1", { status: "completed" }, root);
    await renderFrame("frame 3: task 1 completed, task 2 still in_progress", root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
