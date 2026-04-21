/**
 * Simulates a realistic pi-tasks tool-call session.
 * For each action, prints the above-editor widget followed by the compact
 * tool-output line — exactly what a pi user sees when the task tool executes.
 *
 * Usage: npx tsx scripts/simulate-ui.ts
 */
import { initTheme, Theme } from "@mariozechner/pi-coding-agent";
import { renderTasksError, renderTasksResult } from "../src/render/result.js";
import { renderTasksWidget } from "../src/render/widget.js";
import type { Task, TaskAction } from "../src/schema.js";
import { applyAction } from "../src/state.js";

initTheme();

// theme is exported as a Proxy backed by globalThis[Symbol.for(...)]; the main
// package index doesn't re-export the singleton binding, so we reach it through
// the shared-global key the library uses internally.
const THEME_KEY = Symbol.for("@mariozechner/pi-coding-agent:theme");
const theme = (globalThis as unknown as Record<symbol, Theme>)[THEME_KEY];

const WIDTH = process.stdout.columns || 100;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Derive the display subject + transition the tool would compute, for simulation purposes. */
function derive(prior: Task[], tasks: Task[], input: TaskAction): { subject?: string; transition: string } {
  switch (input.action) {
    case "add":
      return {
        transition: "added",
        ...(((): { subject?: string } => {
          const affected = tasks.find((t) => !prior.some((p) => p.id === t.id));
          return affected ? { subject: affected.content } : {};
        })()),
      };
    case "update":
      return {
        transition: input.status === "in_progress" ? "started" : "updated",
        ...(((): { subject?: string } => {
          const affected = tasks.find((t) => t.id === input.id);
          return affected ? { subject: affected.content } : {};
        })()),
      };
    case "complete":
      return {
        transition: "completed",
        ...(((): { subject?: string } => {
          const affected = tasks.find((t) => t.id === input.id);
          return affected ? { subject: affected.content } : {};
        })()),
      };
    case "remove":
      return {
        transition: "removed",
        ...(((): { subject?: string } => {
          const affected = prior.find((t) => t.id === input.id);
          return affected ? { subject: affected.content } : {};
        })()),
      };
    case "replace":
      return { transition: "replaced", subject: `${input.items.length} task${input.items.length === 1 ? "" : "s"}` };
    case "clear":
      return { transition: "cleared" };
    case "list":
      return { transition: "listed" };
  }
}

function frame(prior: Task[], tasks: Task[], input: TaskAction, now: number) {
  console.log(theme.fg("dim", "── widget (above editor) ──"));
  const widget = renderTasksWidget({ items: tasks, theme, width: WIDTH, now });
  if (widget.length === 0) console.log(theme.fg("dim", "(cleared)"));
  else for (const line of widget) console.log(line);
  console.log("");
  console.log(theme.fg("dim", "── tool output ──"));
  const { subject, transition } = derive(prior, tasks, input);
  for (const line of renderTasksResult({ ...(subject !== undefined ? { subject } : {}), transition, theme })) {
    console.log(line);
  }
  console.log("");
}

async function step(label: string, tasks: Task[], action: TaskAction, now: number) {
  if (label) console.log(theme.fg("accent", `\n${label}`));
  const next = applyAction(tasks, action, now);
  frame(tasks, next, action, now);
  await sleep(600);
  return next;
}

async function main() {
  const t0 = Date.now();
  let tasks: Task[] = [];

  tasks = await step(
    "User asks agent to ship the login flow. Agent plans three tasks.",
    tasks,
    {
      action: "replace",
      items: [
        { id: "1", content: "Wire up auth middleware", activeForm: "Wiring up auth middleware", status: "pending" },
        { id: "2", content: "Add session persistence", activeForm: "Adding session persistence", status: "pending" },
        { id: "3", content: "Write integration tests", activeForm: "Writing integration tests", status: "pending" },
      ],
    },
    t0,
  );

  tasks = await step("Agent starts work on task 1.", tasks, { action: "update", id: "1", status: "in_progress" }, t0);

  console.log(theme.fg("dim", "(…12 seconds pass; widget timer ticks live)"));
  frame(tasks, tasks, { action: "update", id: "1", status: "in_progress" }, t0 + 12_000);
  await sleep(700);

  tasks = await step("Agent finishes task 1, starts task 2.", tasks, { action: "complete", id: "1" }, t0 + 18_000);
  tasks = await step("", tasks, { action: "update", id: "2", status: "in_progress" }, t0 + 18_000);

  tasks = await step(
    "Agent finishes task 2, adds one more, starts task 3.",
    tasks,
    { action: "complete", id: "2" },
    t0 + 42_000,
  );
  tasks = await step(
    "",
    tasks,
    { action: "add", content: "Update the README", activeForm: "Updating the README" },
    t0 + 42_000,
  );
  tasks = await step("", tasks, { action: "update", id: "3", status: "in_progress" }, t0 + 42_000);

  tasks = await step("All tasks complete.", tasks, { action: "complete", id: "3" }, t0 + 60_000);
  tasks = await step("", tasks, { action: "complete", id: "4" }, t0 + 66_000);

  tasks = await step("Agent calls clear — widget disappears.", tasks, { action: "clear" }, t0 + 70_000);

  // Multi-in-progress scenario — shows the "N running" aggregate header.
  tasks = await step(
    "Parallel agent seeds three tasks and starts two at once (e.g. subagent dispatch).",
    tasks,
    {
      action: "replace",
      items: [
        { id: "1", content: "Scan src/schema", activeForm: "Scanning src/schema", status: "pending" },
        { id: "2", content: "Scan src/render", activeForm: "Scanning src/render", status: "pending" },
        { id: "3", content: "Scan src/tool", activeForm: "Scanning src/tool", status: "pending" },
      ],
    },
    t0 + 80_000,
  );
  tasks = await step("Starts task 1.", tasks, { action: "update", id: "1", status: "in_progress" }, t0 + 80_500);
  tasks = await step(
    "Starts task 2 concurrently — widget header switches to '2 running · 0/3 done'.",
    tasks,
    { action: "update", id: "2", status: "in_progress" },
    t0 + 81_000,
  );
  tasks = await step(
    "Completes task 1 while task 2 is still running — widget back to 'Scanning src/render… (Xs)'.",
    tasks,
    { action: "complete", id: "1" },
    t0 + 90_000,
  );
  tasks = await step(
    "Agent calls clear before the error demo.",
    tasks,
    { action: "clear" },
    t0 + 95_000,
  );

  console.log(theme.fg("accent", "\nAgent tries to complete a task that doesn't exist — error is returned."));
  console.log(theme.fg("dim", "── tool output (error) ──"));
  for (const line of renderTasksError({ message: "no prior tasks in session — use 'add' or 'replace' first", theme })) {
    console.log(line);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
