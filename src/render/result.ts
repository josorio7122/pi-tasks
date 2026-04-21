import type { Theme, ThemeColor } from "@mariozechner/pi-coding-agent";

/** Map a transition verb to its semantic color slot. Mirrors result-component.ts. */
function transitionColor(transition: string): ThemeColor {
  switch (transition) {
    case "completed":
      return "success";
    case "started":
    case "updated":
    case "replaced":
      return "accent";
    case "removed":
      return "warning";
    case "added":
      return "text";
    case "error":
      return "error";
    default:
      return "muted";
  }
}

function formatLine(params: { readonly subject?: string; readonly transition: string; readonly theme: Theme }): string {
  const { subject, transition, theme } = params;
  const paren = (s: string) => theme.fg("muted", s);
  const verb = theme.fg(transitionColor(transition), transition);
  return subject !== undefined
    ? `${paren("Task(")}${subject}: ${verb}${paren(")")}`
    : `${paren("Task(")}${verb}${paren(")")}`;
}

export type RenderTasksResultProps = {
  subject?: string;
  transition: string;
  theme: Theme;
};

/** Single-line string form of the result — mirrors renderTasksResultComponent for non-pi-tui consumers. */
export function renderTasksResult(props: RenderTasksResultProps): string[] {
  return [formatLine(props)];
}

export type RenderTasksErrorProps = {
  message: string;
  theme: Theme;
};

export function renderTasksError(props: RenderTasksErrorProps): string[] {
  return [formatLine({ subject: props.message, transition: "error", theme: props.theme })];
}
