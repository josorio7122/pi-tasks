import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export type MarkerPayload = Record<string, unknown>;

let sequence = 0;

/** Write a JSON marker to $PI_TASKS_MARKER_DIR. No-op when env is unset (prod). */
export async function writeMarker(name: string, payload: MarkerPayload): Promise<void> {
  const dir = process.env.PI_TASKS_MARKER_DIR;
  if (!dir) return;
  sequence += 1;
  const filename = `${name}-${Date.now()}-${sequence}.json`;
  const body = JSON.stringify({ name, ts: Date.now(), payload });
  try {
    await writeFile(join(dir, filename), body);
  } catch {
    // Never let marker writes break extension flow.
  }
}
