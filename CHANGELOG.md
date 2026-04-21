# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project
adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — 2026-04-20

Initial release.

- `createTasksTool()` pi-compliant tool factory (via `defineTool` from `@mariozechner/pi-coding-agent`).
- Standalone pi-package install via `pi install git:github.com/josorio7122/pi-tasks` or auto-discovery.
- Library import path for pi packages that want custom branding.
- Above-editor widget + compact `Task(subject: transition)` result line.
- Unit tests + marker-based e2e harness (gated on `PI_BIN`).
