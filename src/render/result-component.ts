import type { Theme, ThemeColor } from "@mariozechner/pi-coding-agent";
import { Container, Text } from "@mariozechner/pi-tui";

/** Map a transition verb to its semantic color slot. */
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

/** Compose the colored `Task(subject: transition)` (or `Task(transition)`) string. */
function formatLine(params: { readonly subject?: string; readonly transition: string; readonly theme: Theme }): string {
  const { subject, transition, theme } = params;
  const paren = (s: string) => theme.fg("muted", s);
  const verb = theme.fg(transitionColor(transition), transition);
  return subject !== undefined
    ? `${paren("Task(")}${subject}: ${verb}${paren(")")}`
    : `${paren("Task(")}${verb}${paren(")")}`;
}

export type RenderTasksResultComponentProps = {
  subject?: string;
  transition: string;
  theme: Theme;
};

export function renderTasksResultComponent(props: RenderTasksResultComponentProps): Container {
  const c = new Container();
  c.addChild(new Text(formatLine(props), 0, 0));
  return c;
}

export type RenderTasksErrorComponentProps = {
  message: string;
  theme: Theme;
};

export function renderTasksErrorComponent(props: RenderTasksErrorComponentProps): Container {
  const c = new Container();
  c.addChild(new Text(formatLine({ subject: props.message, transition: "error", theme: props.theme }), 0, 0));
  return c;
}

export type RenderTasksCallComponentProps = {
  action: string;
  theme: Theme;
};

/** While the tool call is pending, show `Task(<action>: …)`. */
export function renderTasksCallComponent(props: RenderTasksCallComponentProps): Container {
  const { action, theme } = props;
  const c = new Container();
  const paren = (s: string) => theme.fg("muted", s);
  c.addChild(new Text(`${paren("Task(")}${theme.fg("muted", action)}: ${theme.fg("muted", "…")}${paren(")")}`, 0, 0));
  return c;
}
