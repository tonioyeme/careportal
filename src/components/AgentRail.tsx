import { useEffect, useRef } from "react";
import { useStore } from "../store";
import WebMCPBadge from "./WebMCPBadge";
import { formatTime } from "./format";

/**
 * The right-hand column. Everything expressive in this product lives here:
 * the portal itself stays quiet, and the agent colour appears only in this
 * rail and on the row the agent is touching.
 *
 * Entries are newest-last, so the rail reads like a transcript and the newest
 * step is closest to where the agent's next step will appear.
 */
export default function AgentRail() {
  const activity = useStore((s) => s.activity);
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (activity.length === 0) return;
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [activity.length]);

  return (
    <aside
      aria-label="Agent activity"
      className="flex max-h-[50vh] w-full shrink-0 flex-col border-t border-line bg-paper lg:sticky lg:top-16 lg:max-h-none lg:h-[calc(100vh-4rem)] lg:w-[300px] lg:border-l lg:border-t-0"
    >
      <h2 className="shrink-0 px-5 pb-3 pt-5 text-[18px] font-bold text-ink lg:pt-8">
        Agent activity
      </h2>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {activity.length === 0 ? (
          <p className="text-[14px] leading-snug text-ink-soft">
            When your agent uses this page, its steps show here.
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {activity.map((e) => (
              <li
                key={e.id}
                className={[
                  "animate-railIn border-l-2 pl-3",
                  e.kind === "confirm"
                    ? "border-agent"
                    : e.kind === "handoff"
                      ? "border-ochre"
                      : "border-line",
                ].join(" ")}
              >
                <p className="text-[14px] leading-snug text-ink">{e.text}</p>
                <p className="mt-1 text-[12px] text-ink-soft">
                  <span className="tnum">{formatTime(e.at)}</span>
                  {e.tool ? <span className="ml-2">{e.tool}</span> : null}
                </p>
              </li>
            ))}
            <li ref={endRef} aria-hidden="true" />
          </ol>
        )}
      </div>

      <WebMCPBadge />
    </aside>
  );
}
