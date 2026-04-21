# Contributing to pi-tasks

Thanks for considering a contribution! This project is small and opinionated — please follow the conventions below.

## Development setup

```bash
git clone https://github.com/josorio7122/pi-tasks
cd pi-tasks
npm install
npm run check          # lint + typecheck + 77 unit tests
npm run simulate       # visual QA of widget + tool output
```

## Running end-to-end tests

E2E tests exercise the real pi runtime. They're gated on the `PI_BIN` environment variable, so `npm run check` skips them by default.

```bash
export PI_BIN=/path/to/pi   # or /usr/local/bin/pi if installed globally
npm run test:e2e
```

## Code style

- **Pi compliance is non-negotiable.** Never shadow pi's `Theme`, `ThemeColor`, `ToolDefinition`, `ExtensionContext`, or `AgentToolResult` types. Import directly from `@mariozechner/pi-coding-agent`.
- **No raw ANSI escapes** in production code. Use pi's `Theme.fg(slot, text)` / `theme.strikethrough(text)` / etc.
- **Strings: don't assemble literal text with `+` or array-then-`.join()`.** Multi-line prose uses a template literal + `.replace(/\s+/g, " ").trim()` at load time (see `DEFAULT_DESCRIPTION` in `src/tool.ts`). Simple variable concat (`pad + line`) is fine — the rule is about building one string from multiple string *literals*, not about all `+` operators. Arrays you return as the domain type (widget lines, etc.) are fine to `.join()` at the boundary.
- **Typebox for schemas**, not zod. Pi bundles typebox.
- **Biome enforces:** no `any`, no non-null assertions (`!`), no barrel files (except `api.ts`), max 2 params per function, 120-char lines.
- **File size:** aim for < 200 LOC per file. Split by responsibility when exceeded.
- **Tests colocate:** `foo.ts` → `foo.test.ts`. E2E tests use the `-e2e.test.ts` suffix.

## Commit messages

- Format: `type(scope): description` — conventional commits. Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `ci`, `style`.
- **No `Co-Authored-By` trailers** — especially no AI attribution.
- Breaking changes use `!`: `feat(tool)!: rename createTasksTool config`.

## Pull requests

- Branch off `main`. Name: `feature/<short-name>`, `fix/<short-name>`.
- Open a PR early if the change is non-trivial — discuss approach before you invest hours.
- CI (`npm run check`) must pass before merge. Review is required for non-trivial changes.

## What belongs in pi-tasks

- The `task` tool's behavior, widget rendering, result rendering, schema, state.
- Helpers that other pi-package authors need when building task-aware UIs.

## What does NOT belong

- Persistent storage beyond the pi session transcript.
- Integrations with external task managers (Linear, Jira, etc.) — belongs in a separate pi-package.
- Changes to pi-core types or contracts (upstream to pi-mono).

## Reporting issues

Use the GitHub issue tracker. For security issues, see [SECURITY.md](SECURITY.md).
