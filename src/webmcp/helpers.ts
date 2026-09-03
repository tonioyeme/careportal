import { selectors, useStore } from "../store";
import type { Highlight } from "../data/types";
import type { ToolResult } from "./registry";

/** Wrap a payload as a WebMCP text result, always attaching acting_for. */
export function text(payload: Record<string, unknown>): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ ...payload, acting_for: selectors.actingFor() }),
      },
    ],
  };
}

/**
 * Page-follow: every tool calls this first so the human sees where the agent is.
 * Navigates, highlights, and logs one plain-English line to the activity rail.
 */
export function follow(path: string, highlight: Highlight | null, activity: { tool: string; text: string; kind?: "read" | "confirm" | "handoff" }) {
  const s = useStore.getState();
  s.requestNavigate(path);
  s.setHighlight(highlight);
  s.pushActivity({ kind: "read", ...activity });
}

/** Prefix injected into every patient-scope description. */
export function actingPrefix(): string {
  const a = selectors.actingFor();
  return a.relationship === "self"
    ? `[Acting for ${a.name} (self)]`
    : `[Acting for ${a.name} via proxy access]`;
}

export function daysLabel(n: number) {
  return n === 1 ? "1 day" : `${n} days`;
}
