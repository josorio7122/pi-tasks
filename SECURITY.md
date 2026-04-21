# Security Policy

## Supported versions

Only the latest minor version is supported. Security fixes are released as patch versions against that line.

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅        |
| < 0.1   | ❌        |

## Reporting a vulnerability

Please report security issues privately via GitHub's security advisory feature:

[Report a vulnerability →](https://github.com/josorio7122/pi-tasks/security/advisories/new)

You can also email: josorio7122@gmail.com

I'll acknowledge within 72 hours and provide a fix timeline within 7 days. Do not open a public issue for security reports.

## Scope

In scope:
- The `task` tool's runtime behavior — anything a user can trigger via LLM tool calls.
- The extension factory (`src/index.ts`).
- Markers / e2e harness if exploitable in a test environment.

Out of scope:
- Vulnerabilities in pi's own runtime (`@mariozechner/pi-coding-agent`) — report upstream at [pi-mono](https://github.com/badlogic/pi-mono).
- Dependency vulnerabilities in typebox / pi-tui without a pi-tasks-specific attack vector — covered by upstream.
