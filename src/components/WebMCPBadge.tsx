import { useStore } from "../store";
import { plural } from "./format";

/**
 * Pinned to the bottom of the agent rail. This one is for the judges, not for
 * Linda, which is why it lives in a corner at 12px.
 */
export default function WebMCPBadge() {
  const { status, toolCount } = useStore((s) => s.webmcp);
  const native = status === "native";

  return (
    <div className="shrink-0 border-t border-line px-5 py-4">
      <p className="flex items-center gap-2 text-[12px] text-ink-soft">
        <span
          aria-hidden="true"
          className={[
            "h-2 w-2 shrink-0 rounded-full",
            native ? "bg-agent" : "border border-ink-soft bg-transparent",
          ].join(" ")}
        />
        {native ? (
          <span className="tnum">WebMCP native · {plural(toolCount, "tool", "tools")}</span>
        ) : (
          <span>WebMCP unavailable</span>
        )}
      </p>
      {!native && (
        <p className="mt-1 text-[12px] leading-snug text-ink-soft">
          Turn on{" "}
          <span className="break-all text-ink">chrome://flags/#enable-webmcp-testing</span> in
          Chrome and reload to let an agent use this page.
        </p>
      )}
    </div>
  );
}
