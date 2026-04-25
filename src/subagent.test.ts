import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTask } from "./storage/index.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "pi-tasks-subagent-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("subagent inheritance via PI_TASK_LIST_ID", () => {
  it("a child node process inheriting PI_TASK_LIST_ID writes to the same dir", async () => {
    // Parent creates task #1
    await createTask("shared", { subject: "parent task", description: "p" }, root);

    // Spawn a child Node process that imports our storage and creates task #2 against the same id.
    // We use `node --import tsx --input-type=module -e` so the eval is treated as ESM (enabling
    // top-level await) and tsx's `.js` → `.ts` resolution shim handles the source import.
    const childCode = `
      import { createTask } from "./src/storage/index.js";
      const id = await createTask(process.env.PI_TASK_LIST_ID, { subject: "child task", description: "c" }, ${JSON.stringify(root)});
      console.log("child-id=" + id);
    `;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", childCode], {
      cwd: process.cwd(),
      env: { ...process.env, PI_TASK_LIST_ID: "shared" },
      encoding: "utf-8",
    });

    expect(result.status, `stdout: ${result.stdout}\nstderr: ${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("child-id=2");

    const parent = JSON.parse(readFileSync(join(root, "shared", "1.json"), "utf-8"));
    const child = JSON.parse(readFileSync(join(root, "shared", "2.json"), "utf-8"));
    expect(parent.subject).toBe("parent task");
    expect(child.subject).toBe("child task");
  });
});
