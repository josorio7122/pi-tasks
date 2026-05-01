# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project
adheres to [Semantic Versioning](https://semver.org/).

## v0.2.3 — 2026-05-01

### Fixed

- All four tools now write to a single shared widget slot. Previously each tool called `ui.setWidget(<toolName>, …)` keyed on its own tool name (`task_create`, `task_update`, `task_list`, `task_get`), producing up to four stacked widgets in the pi UI as the model used different tools across a session. The shared key is derived from the namePrefix (default `task`); custom prefixes (e.g. `plan_create`/`plan_update`/…) collapse to a single `plan` slot.

## v0.2.2 — 2026-05-01

### Fixed

- Move `@types/proper-lockfile` from devDependencies to dependencies. Since the package entry exports raw `.ts` source (`exports."."` → `./src/api.ts`), TypeScript consumers transitively compile our storage modules and need the type declarations at install time. Without this, downstream `tsc --noEmit` fails with TS7016 on `proper-lockfile`.

## v0.2.1 — 2026-05-01

### Added

- Public re-exports of storage helpers (`cloneTaskList`, `ensureTasksDir`, `getTaskListId`, `PI_TASK_LIST_ID_ENV`) from the package entry. Library consumers (e.g. pi-superpowers) can now replicate the default extension's `session_start` glue — subagent task-list sharing via `PI_TASK_LIST_ID` and fork cloning — without reimplementing them.

## v0.2.0 — 2026-04-25

### Breaking changes

- The single `task` tool has been replaced with four tools: `task_create`, `task_update`, `task_list`, `task_get`, mirroring Claude Code's V2 task system.
- Action enum (`add`/`replace`/`update`/`complete`/`remove`/`clear`/`list`) is gone. Use the appropriate tool instead.
- `Task.content` renamed to `Task.subject`; `description` is now a separate required field on creation.
- Tool result text changed from `Task(<subject>: <transition>)` to V2-style strings (`Task #<id> created successfully: ...`, etc.).
- Public API: `createTasksTool` (singular) replaced by `createTasksTools` (plural) and `registerTasksTools`.

### Added

- Per-task JSON storage at `~/.pi/agent/tasks/<sessionId>/<id>.json`, with `proper-lockfile` concurrency.
- `.highwatermark` file prevents id reuse after deletion.
- Subagent task list sharing via `PI_TASK_LIST_ID` env carrier set on `session_start`.
- Fork branches clone the parent's task dir on `session_start` (reason="fork") so branches don't share mutable state.
- Verification nudge — when a task list of 3+ tasks closes out without any `verif`-named task, `task_update` appends a directive to spawn the bundled `verifier` subagent.
- Bundled `agents/verifier.md` — read-only verification subagent.

### Removed

- Session-entry reconstruction (`applyAction`, `reconstructTasks`). Disk is now the source of truth.
- Custom result/error/call render components — V2 plain text is used directly.

## [0.1.0] — 2026-04-20

Initial release.

- `createTasksTool()` pi-compliant tool factory (via `defineTool` from `@mariozechner/pi-coding-agent`).
- Standalone pi-package install via `pi install git:github.com/josorio7122/pi-tasks` or auto-discovery.
- Library import path for pi packages that want custom branding.
- Above-editor widget + compact `Task(subject: transition)` result line.
- Unit tests + marker-based e2e harness (gated on `PI_BIN`).
