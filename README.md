# pi-tasks

[![CI](https://github.com/josorio7122/pi-tasks/actions/workflows/check.yml/badge.svg)](https://github.com/josorio7122/pi-tasks/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![pi-package](https://img.shields.io/badge/pi--package-v0.2.0-36f9f6)](https://github.com/josorio7122/pi-tasks/releases/tag/v0.2.0)

> Four task tools for [pi](https://github.com/badlogic/pi-mono) agents — disk-backed, session-scoped tasks with a live above-editor widget, mirroring Claude Code's V2 task system.

`pi-tasks` ships two things:

1. A **pi extension** that registers four tools — `task_create`, `task_update`, `task_list`, `task_get` (installable via `pi install` or auto-discovery).
2. A **library** (`registerTasksTools` / `createTasksTools`) for pi packages that want to register the tools themselves with custom branding / naming / description.

The widget above the editor shows live task state; tool output is V2-style plain text (e.g. `Task #1 created successfully: Build login flow`).

## Install as a pi-package

```bash
# via git (recommended until published to npm)
pi install git:github.com/josorio7122/pi-tasks

# or a specific tag
pi install git:github.com/josorio7122/pi-tasks@v0.2.0

# quick test without writing to settings
pi -e git:github.com/josorio7122/pi-tasks

# auto-discovery: clone into pi's extensions dir
git clone git@github.com:josorio7122/pi-tasks.git ~/.pi/agent/extensions/pi-tasks
cd ~/.pi/agent/extensions/pi-tasks && npm install
```

Once installed, pi's four task tools are available to any session. Defaults:

- Tool names: `task_create`, `task_update`, `task_list`, `task_get`
- Labels: `Task Create`, `Task Update`, `Task List`, `Task Get`
- `brand: "●"` — glyph prefixed to the above-editor widget header
- `description` — each tool's description encodes the work-tracking discipline (mark `in_progress` before working, only one `in_progress` at a time, complete immediately, don't batch). See `src/tools/*.ts` for the full text.

## Use as a library

For consumers that want custom branding (e.g. pi-superpowers registers the tools with `🦸`):

```ts
import { registerTasksTools } from "pi-tasks";

// Default — registers task_create, task_update, task_list, task_get
registerTasksTools(pi);

// Custom branding (e.g., pi-superpowers)
registerTasksTools(pi, {
  brand: "🦸",
  namePrefix: "plan",   // → plan_create, plan_update, plan_list, plan_get
  labelPrefix: "Plan",
  verifierAgentName: "verifier",
});
```

The user's active pi `Theme` is consumed automatically — no theme config required from the host.

## Output

**Widget** (above editor, via `ui.setWidget`):

```
● Wiring up auth middleware… (12s)
   ✓  Wire up auth middleware
   ◼  Add session persistence
   ◼  Write integration tests
```

**Tool output** (V2-style plain text):

```
Task #1 created successfully: Build login flow
Updated task #1 status
#1 [in_progress] Build login flow
Task not found
No tasks found
```

## Public API

```ts
// Tool factories
createTasksTools(config?: CreateTasksToolsConfig): { create, update, list, get }
registerTasksTools(pi: ExtensionAPI, config?: CreateTasksToolsConfig): void

// Renderers (for custom consumers)
renderTasksWidget(props): string[]
formatElapsed(ms): string                        // "12s", "1m 30s", …

// Schema (typebox)
TaskSchema, TaskStatusSchema
types: Task, TaskStatus
```

## Development

```bash
npm install
npm run check      # lint + typecheck + tests (vitest)
npm run simulate   # visual QA of widget + tool output
npm run test:e2e   # requires PI_BIN — exercises the real pi runtime
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions, [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Migrating from v0.1

v0.2 mirrors Claude Code's V2 task system. The full spec/plan lives under `docs/superpowers/` locally — gitignored and not shipped. Breaking changes:

- Single `task` tool replaced with 4 tools (`task_create`, `task_update`, `task_list`, `task_get`).
- Action enum gone — use the appropriate tool.
- `Task.content` renamed to `Task.subject`; `description` is required on creation.
- Tool result text changed to V2 wording (`Task #<id> created successfully: ...`).
- Public API: `createTasksTool` → `createTasksTools` / `registerTasksTools`.
- Disk-backed storage at `~/.pi/agent/tasks/<sessionId>/`.

## License

MIT
