import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import type { HighlightKind } from "../data/types";

/**
 * Wraps anything a WebMCP tool can point at (an appointment, a medication row,
 * a result, a message thread, a document). When `store.highlight` matches, the
 * row grows a 3px rule in the agent colour, the agent tint sweeps across it
 * once, and it scrolls itself to the middle of the viewport.
 *
 * The rule is always in the box model (transparent when idle) so nothing
 * shifts sideways when the agent arrives.
 */
export default function Highlightable({
  kind,
  id,
  children,
  className,
}: {
  kind: HighlightKind;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const highlight = useStore((s) => s.highlight);
  const active = highlight?.kind === kind && highlight?.id === id;
  const ref = useRef<HTMLDivElement>(null);
  // Bumped on every new highlight so the sweep element remounts and replays.
  const [sweep, setSweep] = useState(0);

  useEffect(() => {
    if (!active) return;
    setSweep((n) => n + 1);
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active, highlight]);

  return (
    <div
      ref={ref}
      className={[
        "relative -ml-[19px] border-l-[3px] pl-4",
        active ? "border-agent" : "border-transparent",
        className ?? "",
      ].join(" ")}
    >
      {active && (
        <span
          key={sweep}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-agentSweep"
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
