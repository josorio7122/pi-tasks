import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createTasksTool } from "./tool.js";

/**
 * Pi extension factory — registers the task tool with default configuration.
 *
 * Usage (auto-discovery):
 *   Drop this package at ~/.pi/agent/extensions/pi-tasks/ and pi's extension
 *   loader will invoke this factory via the pi.extensions manifest in package.json.
 *
 * Usage (pi install):
 *   pi install git:github.com/josorio7122/pi-tasks
 *
 * For customization (brand, name, description), consume pi-tasks as a library
 * instead: import { createTasksTool } from "pi-tasks".
 */
export default function tasksExtension(pi: ExtensionAPI): void {
  pi.registerTool(createTasksTool());
}
