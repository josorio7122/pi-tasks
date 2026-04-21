import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packageRoot } from "./paths.js";

export type RunPiE2EProps = {
  args?: string[];
  prompt: string;
  timeoutMs?: number;
  env?: Record<string, string>;
};

export type RunPiMarker = {
  name: string;
  ts: number;
  payload: unknown;
};

export type RunPiE2EResult = {
  stdout: string;
  stderr: string;
  markerDir: string;
  markers: RunPiMarker[];
  cleanup: () => Promise<void>;
};

async function readMarkers(dir: string): Promise<RunPiMarker[]> {
  const files = await readdir(dir);
  const markers = await Promise.all(files.map(async (f) => JSON.parse(await readFile(join(dir, f), "utf8"))));
  return (markers as RunPiMarker[]).sort((a, b) => a.ts - b.ts);
}

type SpawnResult = { stdout: string; stderr: string };

type SpawnPiProps = {
  args: string[];
  prompt: string;
  timeoutMs: number;
  env: Record<string, string>;
};

function spawnPi(props: SpawnPiProps): Promise<SpawnResult> {
  const { args, prompt, timeoutMs, env } = props;
  const PI_BIN = process.env.PI_BIN;
  if (!PI_BIN) return Promise.reject(new Error("PI_BIN not set"));
  return new Promise((resolve, reject) => {
    const proc = spawn(PI_BIN, args, { cwd: packageRoot(), env });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => {
      out += d.toString();
    });
    proc.stderr.on("data", (d) => {
      err += d.toString();
    });
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`pi timed out after ${timeoutMs}ms\nstderr: ${err}`));
    }, timeoutMs);
    proc.stdin.write(prompt);
    proc.stdin.end();
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout: out, stderr: err });
      else reject(new Error(`pi exited with code ${code}\nstderr: ${err}`));
    });
  });
}

export async function runPiE2E(props: RunPiE2EProps): Promise<RunPiE2EResult> {
  const markerDir = await mkdtemp(join(tmpdir(), "pitasks-e2e-"));
  const args = props.args ?? ["--mode", "json", "-p", "--no-session", "-e", "./src/index.ts"];
  const timeoutMs = props.timeoutMs ?? 60_000;
  const env = { ...process.env, PI_TASKS_MARKER_DIR: markerDir, ...(props.env ?? {}) } as Record<string, string>;

  const { stdout, stderr } = await spawnPi({ args, prompt: props.prompt, timeoutMs, env });
  const markers = await readMarkers(markerDir);

  return {
    stdout,
    stderr,
    markerDir,
    markers,
    cleanup: async () => {
      await rm(markerDir, { recursive: true, force: true });
    },
  };
}

export type RetryProps = {
  attempts: number;
  check: (result: RunPiE2EResult) => boolean;
};

// Retry wrapper for E2E tests that depend on model behaviour (tool-calling).
// Tool invocation via a natural-language prompt can be flaky; this retries until
// the `check` predicate passes or `attempts` is exhausted, cleaning up between.
export async function runPiE2EWithRetry(props: RunPiE2EProps, retry: RetryProps): Promise<RunPiE2EResult> {
  let last: RunPiE2EResult | undefined;
  for (let i = 0; i < retry.attempts; i++) {
    if (last) await last.cleanup();
    last = await runPiE2E(props);
    if (retry.check(last)) return last;
  }
  if (!last) throw new Error("runPiE2EWithRetry produced no result");
  return last;
}
