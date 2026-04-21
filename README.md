# pi-tasks

[![CI](https://github.com/josorio7122/pi-tasks/actions/workflows/check.yml/badge.svg)](https://github.com/josorio7122/pi-tasks/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![pi-package](https://img.shields.io/badge/pi--package-v0.1.0-36f9f6)](https://github.com/josorio7122/pi-tasks/releases/tag/v0.1.0)

> A `task` tool for [pi](https://github.com/badlogic/pi-mono) agents — session-scoped tasks with a live above-editor widget and compact tool output.

`pi-tasks` ships two things:

1. A **pi extension** that registers the `task` tool (installable via `pi install` or auto-discovery).
2. A **library** (`createTasksTool`) for pi packages that want to register the tool themselves with custom branding / naming / description.

The widget above the editor shows live task state; the tool output is a single compact `Task(<subject>: <transition>)` line per call.

## Install as a pi-package

```bash
# via git (recommended until published to npm)
pi install git:github.com/josorio7122/pi-tasks

# or a specific tag
pi install git:github.com/josorio7122/pi-tasks@v0.1.0

# quick test without writing to settings
pi -e git:github.com/josorio7122/pi-tasks

# auto-discovery: clone into pi's extensions dir
git clone git@github.com:josorio7122/pi-tasks.git ~/.pi/agent/extensions/pi-tasks
cd ~/.pi/agent/extensions/pi-tasks && npm install
```

Once installed, pi's `task` tool is available to any session. Defaults:

- `name: "task"` — identifier the LLM calls
- `label: "Tasks"` — human-readable label pi uses in menus
- `brand: "●"` — glyph prefixed to the above-editor widget header
- `description` — the tool description the LLM reads. Encodes the work-tracking discipline: mark tasks `in_progress` before working, only one `in_progress` at a time, `complete` immediately, don't batch. See `DEFAULT_DESCRIPTION` in `src/tool.ts` for the full text.

## Use as a library

For consumers that want custom branding (e.g. pi-superpowers registers the tool with `🦸`):

```ts
import { createTasksTool } from "pi-tasks";

pi.registerTool(createTasksTool({
  brand: "🦸",             // widget prefix
  name: "my_task",         // tool name the LLM sees
  headerPrefix: "Plan",    // widget header label when idle (default: "Tasks")
}));
```

Returns a pi `ToolDefinition` (via `defineTool`). The user's active pi `Theme` is consumed automatically — no theme config required from the host.

## Output

**Widget** (above editor, via `ui.setWidget`):

```
● Wiring up auth middleware… (12s)
   ✓  Wire up auth middleware
   ◼  Add session persistence
   ◼  Write integration tests
```

**Tool output** (per call):

```
Task(Wire up auth middleware: completed)
Task(Update the README: added)
Task(replaced: 3 tasks)
Task(cleared)
Task(no prior tasks in session: error)
```

Transitions: `added` / `started` / `updated` / `completed` / `removed` / `replaced` / `cleared` / `listed` / `error`. Each verb picks a canonical pi theme color slot (success / accent / warning / muted / error).

## Public API

```ts
// Tool factory
createTasksTool(config?: CreateTasksToolConfig): ToolDefinition

// Renderers (for custom consumers)
renderTasksWidget(props): string[]
renderTasksResult(props): string[]
renderTasksError(props): string[]
renderTasksResultComponent(props): Container     // pi-tui Component
renderTasksErrorComponent(props): Container
renderTasksCallComponent(props): Container
formatElapsed(ms): string                        // "12s", "1m 30s", …

// Schema (typebox)
TaskSchema, TaskStatusSchema, TaskActionSchema, TaskDetailsSchema, TaskToolParamsSchema
types: Task, TaskAction, TaskDetails, TaskStatus

// State (pure)
applyAction(prior, action, now?): Task[]
reconstructTasks(entries, toolName): Task[]

// Tree primitives (for custom renderers)
bullet, branch, checkbox, indent, BULLET, BRANCH, CROSS
```

## Development

```bash
npm install
npm run check      # lint + typecheck + tests (vitest)
npm run simulate   # visual QA of widget + tool output
npm run test:e2e   # requires PI_BIN — exercises the real pi runtime
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for conventions, [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

MIT
