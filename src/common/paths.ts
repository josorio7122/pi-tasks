import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the pi-tasks package root (for spawning pi with cwd set correctly). */
export function packageRoot(): string {
  return resolve(__dirname, "..", "..");
}
