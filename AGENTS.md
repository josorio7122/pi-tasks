# Agent Instructions

Rules for AI agents (and humans) editing this repo. Short and enforced — read before writing code.

## Strings

The rule targets *literal* string assembly, not variable concatenation.

- **Never build a string by joining string literals with `+`.** If the output is a single string written across multiple lines in source, use a template literal. Concrete BAD example:
  ```ts
  const desc = "Line one. " +
               "Line two. " +
               "Line three.";
  ```
  Instead:
  ```ts
  const desc = flatten(`
    Line one.
    Line two.
    Line three.
  `);
  ```
  where `flatten = s => s.replace(/\s+/g, " ").trim()`. See `src/tool.ts:DEFAULT_DESCRIPTION` for the canonical form.
- **Never build a string by pushing literals into an array and `.join()`-ing it.** Same anti-pattern, different syntax. If the output is a string, write it as a template literal.
- **`a + b` with variables is fine.** Simple variable concat like `pad + line` or `prefix + suffix` reads clearly and doesn't need `` `${a}${b}` `` unless interpolation is needed elsewhere.
- **`.join()` is fine when the array IS the domain type** — e.g. `ui.setWidget(name, string[])` wants an array of rendered lines. Joining for display at a boundary is OK.

## Pi compliance (non-negotiable)

- **Never shadow pi's types.** Import `Theme`, `ThemeColor`, `ToolDefinition`, `ExtensionContext`, `AgentToolResult`, `ExtensionAPI` directly from `@mariozechner/pi-coding-agent`. Do not redeclare them with our own names.
- **No raw ANSI escapes (`\x1b[...]`) in production code.** Use `theme.fg(slot, text)`, `theme.strikethrough(text)`, `theme.bold(text)`.
- **Canonical `ThemeColor` slots only:** `accent`, `muted`, `dim`, `text`, `success`, `error`, `warning`. Don't invent new slot names.
- **Peer deps for pi core packages use `"*"`** per pi's `docs/packages.md`. Never pin them.

## TypeScript

- **No classes.** Factory functions + closures for stateful behavior.
- **Typebox for schemas** (not zod). Pi bundles typebox.
- **No `any`**, **no non-null assertions (`!`)**, **no barrel files except `src/api.ts`**. Enforced by biome.
- **No nested ternaries.** Enforced by biome (`noNestedTernary: "error"`). Use early returns or a helper function.
- **Max 2 params per function.** Use an options object for anything longer.
- **Blank line between consecutive multi-line blocks at the same scope.** Enforced via `scripts/check-blank-lines.sh`, wired into `npm run check` (and therefore CI). The script flags any closing line (`}`, `};`, `});`, `]`, `];`, `]);`) at indent X that is followed IMMEDIATELY by a line at the same indent X that opens a new multi-line block (ends with `{` or `(`). Biome can't do this itself (2.4.x has no equivalent of ESLint's `padding-line-between-statements`), hence the script.
- **File size target: < 200 LOC.** Split by responsibility when exceeded.
- **ESM-only.** `.js` extensions on relative imports.

## Functional programming (core value)

pi-tasks is a pure library at its core. Mutation is confined to the edges (IO with pi, pi-tui's `Container.addChild`, shell streams).

- **`const` everywhere in production code.** `let` is forbidden inside `src/` production modules — no exceptions. Use `.map`/`.filter`/`.reduce`/`.find`/`.findLast`/`.flatMap` to build new values, or recursive helpers. IO-boundary code in `src/common/` MAY use `let` when bridging a stream or Node API that can't be expressed functionally (e.g. `child_process.stdout.on("data", d => out += d)`).
- **No mutation of inputs.** Every function that takes a collection must return a NEW collection. Never `.push`/`.pop`/`.shift`/`.unshift`/`.splice`/`.sort`/`.reverse` on arrays passed in. Use spread + immutable helpers.
- **Inputs and exports are `readonly`.** `readonly Task[]` / `ReadonlyArray<T>` / `Readonly<T>` on public types. Internal intermediates may be `T[]` if constructed fresh.
- **No imperative loops for value construction.** Don't write `for (let i = 0; i < n; i++) arr.push(x)`. Use `.map` / `Array.from({length: n}, …)` / recursion.
  - `for...of` for side effects (e.g. `for (const line of lines) console.log(line)` in dev scripts) is OK.
  - `for...of` to build a new collection by pushing is NOT — use `.map`/`.flatMap`.
- **Sandwich architecture.** Pure core (schema, state, render) wrapped by thin IO shell (`tool.ts` execute, `common/e2e-runner.ts`, scripts). Push side effects to the edges.
- **Idempotent pure functions.** Same args → same return value, every time. Inject `now` / clock as an explicit parameter (see `applyAction(items, action, now)`).
- **Classes are banned** (already above) — they encourage mutable state. Exception: pi-tui's own components (`Container`, `Text`) are instantiated via `new` at the rendering boundary; we don't extend them.

## Tests

- **Co-locate:** `foo.ts` → `foo.test.ts`.
- **E2E tests use the `-e2e.test.ts` suffix** and are gated on `PI_BIN` (see `src/common/e2e-runner.ts`).
- **Mock pi's `Theme` via `src/test/mock-theme.ts`** — don't build ad-hoc mocks.
- `npm run check` before commit; `npm run test:e2e` requires `PI_BIN`.

## Git

- **Conventional commits:** `type(scope): description`. Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `ci`, `style`.
- **No `Co-Authored-By` trailers.** No AI attribution.
- **Breaking changes use `!`:** `feat(tool)!: rename config`.
- **Branch protection is on `main`** — CI (`check`) must pass before merge. PRs squash-merge only.

## When in doubt

See `CONTRIBUTING.md` for the human-facing version. When the two disagree, `AGENTS.md` wins.
