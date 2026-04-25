import type { ExtensionContext, SessionEntry } from "@mariozechner/pi-coding-agent";
import { vi } from "vitest";
import { mockTheme } from "./mock-theme.js";

export type MockContextOptions = {
  sessionId?: string;
  entries?: SessionEntry[];
};

/**
 * Build a minimal ExtensionContext for tool tests. Production tools touch
 * sessionManager.getSessionId / getEntries / appendCustomEntry, ui.theme, and
 * ui.setWidget — those are the only fields stubbed here. `as unknown as
 * ExtensionContext` is the same cast every ad-hoc factory used; centralizing it
 * avoids re-declaring the same `as never` / `as unknown as` ceremony per file.
 */
export function makeMockContext(opts: MockContextOptions = {}): ExtensionContext {
  const sessionId = opts.sessionId ?? "sess";
  const entries = opts.entries ?? [];
  return {
    sessionManager: {
      getSessionId: () => sessionId,
      getEntries: () => entries,
      appendCustomEntry: vi.fn(),
    },
    ui: { theme: mockTheme(), setWidget: vi.fn() },
  } as unknown as ExtensionContext;
}
