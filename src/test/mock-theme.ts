// src/test/mock-theme.ts
import type { Theme } from "@mariozechner/pi-coding-agent";

/**
 * Identity-stub of pi's Theme class. For use in tests — every method returns
 * its input unchanged, so assertions on output strings aren't polluted with
 * ANSI escapes. Type-asserted to Theme because the real class has private
 * fields; only the methods the renderers actually consume (`fg`,
 * `strikethrough`, `bold`) are implemented here.
 */
export function makeMockTheme(): Theme {
  const fg = (_color: unknown, text: string): string => text;
  const strikethrough = (text: string): string => text;
  const bold = (text: string): string => text;
  return { fg, strikethrough, bold } as unknown as Theme;
}

/** Alias used by newer tool tests. */
export const mockTheme = makeMockTheme;
