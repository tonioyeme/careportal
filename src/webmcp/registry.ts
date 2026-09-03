/**
 * The ONLY file that calls document.modelContext.registerTool.
 * Everything else registers through `registerTool(scope, def)`.
 *
 * Three scopes, each an AbortController:
 *   auth    — before login: get_login_status only
 *   patient — after login; rebuilt on every patient switch
 *   route   — page-specific tools (reschedule_appointment on /appointments/:id)
 */
import { useStore } from "../store";

export type Scope = "auth" | "patient" | "route";

// Minimal structural typing so we don't depend on @mcp-b/webmcp-types at runtime.
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /**
   * Machine-readable capability tier, per the WebMCP guidance. `readOnlyHint`
   * lets an agent tell at a glance which tools it may call freely and which
   * ones will stop and ask a human. The tools that change something are also
   * the tools that open a confirmation card, so this mirrors the real boundary.
   */
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
  execute: (input: any) => Promise<ToolResult> | ToolResult;
}
export interface ToolResult {
  content: { type: "text"; text: string }[];
}

interface ModelContextLike {
  registerTool(def: ToolDefinition, opts?: { signal?: AbortSignal }): void;
}

/**
 * Where the entry point lives depends on the Chrome version. The WebMCP draft
 * moved the getter from Navigator to Document on 2026-05-27, and Chrome 150
 * deprecated navigator.modelContext. Prefer document; fall back to navigator so
 * Chrome 146-149 still works. Both expose registerTool(tool, { signal }).
 */
const mc = (): ModelContextLike | null => {
  if (typeof document !== "undefined" && "modelContext" in document)
    return (document as any).modelContext;
  if (typeof navigator !== "undefined" && "modelContext" in navigator)
    return (navigator as any).modelContext;
  return null;
};

export const hasWebMCP = mc() !== null;

/** Where the tools ended up. Surfaced in the console so a demo can be debugged. */
export const webmcpHost: "document" | "navigator" | "none" =
  typeof document !== "undefined" && "modelContext" in document
    ? "document"
    : typeof navigator !== "undefined" && "modelContext" in navigator
      ? "navigator"
      : "none";

if (typeof console !== "undefined") {
  console.info(
    hasWebMCP
      ? `[CarePortal] WebMCP found on ${webmcpHost}.modelContext — tools will register.`
      : "[CarePortal] No WebMCP API on this page. Enable chrome://flags/#enable-webmcp-testing " +
        "(Chromium 146+) and reload. The portal works normally either way.",
  );
}

const controllers: Record<Scope, AbortController | null> = {
  auth: null,
  patient: null,
  route: null,
};
const counts: Record<Scope, number> = { auth: 0, patient: 0, route: 0 };

function refreshBadge() {
  useStore.getState().setWebMCP({
    status: hasWebMCP ? "native" : "unavailable",
    toolCount: counts.auth + counts.patient + counts.route,
  });
}

/** Abort whatever was in this scope and start a fresh one. Returns its signal. */
export function openScope(scope: Scope): AbortSignal {
  controllers[scope]?.abort();
  controllers[scope] = new AbortController();
  counts[scope] = 0;
  refreshBadge();
  return controllers[scope]!.signal;
}

export function closeScope(scope: Scope) {
  controllers[scope]?.abort();
  controllers[scope] = null;
  counts[scope] = 0;
  refreshBadge();
}

export function closeAll() {
  (Object.keys(controllers) as Scope[]).forEach(closeScope);
}

/**
 * Register one tool into a scope. Safe to call when WebMCP is unavailable
 * (no-op except for logging). Throws if the scope hasn't been opened.
 */
export function registerTool(scope: Scope, def: ToolDefinition) {
  const ctrl = controllers[scope];
  if (!ctrl) throw new Error(`registerTool: scope "${scope}" is not open`);
  const api = mc();
  if (!api) return; // badge already says unavailable

  api.registerTool(
    {
      ...def,
      // Wrap execute so every call shows up in the activity rail even if the
      // tool author forgets. Tool authors should still push a nicer line.
      execute: async (input: unknown) => {
        try {
          return await def.execute(input);
        } catch (err) {
          useStore.getState().pushActivity({
            tool: def.name,
            text: `Something went wrong in ${def.name}`,
            kind: "system",
          });
          return {
            content: [{ type: "text", text: JSON.stringify({ status: "error", reason: String(err) }) }],
          };
        }
      },
    },
    { signal: ctrl.signal },
  );
  counts[scope] += 1;
  refreshBadge();
}

// Vite HMR: tear everything down so re-registration doesn't throw InvalidStateError.
if (import.meta.hot) {
  import.meta.hot.dispose(closeAll);
}
