/**
 * Confirmation protocol.
 *
 *  tool ──showConfirm()──▶ card opens ──user approves──▶ { approved: true, editedValue? }
 *                                     ──user declines──▶ { approved: false }
 *                                     ──60s elapsed────▶ { timeout: true }  (card STAYS open;
 *                                                          a later approval calls onLateApprove)
 *  second showConfirm() while one is open ─────────────▶ { busy: true }
 *
 * Stream B (tools) calls showConfirm. Stream C (ConfirmCard.tsx) calls resolveConfirm.
 */
import { useStore, type ConfirmRequest } from "../store";

export type ConfirmResult =
  | { approved: true; editedValue?: string }
  | { approved: false }
  | { timeout: true }
  | { busy: true };

export const CONFIRM_TIMEOUT_MS = 60_000;

let resolver: ((r: ConfirmResult) => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

export function showConfirm(req: Omit<ConfirmRequest, "id">): Promise<ConfirmResult> {
  const s = useStore.getState();
  if (s.confirm) return Promise.resolve({ busy: true });

  const id = `confirm_${++seq}`;
  s.setConfirm({ ...req, id });
  s.pushActivity({ tool: "", text: `Asked you to confirm: ${req.title}`, kind: "confirm" });

  return new Promise((resolve) => {
    resolver = (r) => {
      if (timer) clearTimeout(timer);
      timer = null;
      resolver = null;
      resolve(r);
    };
    timer = setTimeout(() => {
      // Tool returns pending; card stays open; late approval goes through onLateApprove.
      resolver = null;
      timer = null;
      resolve({ timeout: true });
    }, CONFIRM_TIMEOUT_MS);
  });
}

/** Called by ConfirmCard.tsx when the user clicks approve/decline. */
export function resolveConfirm(r: { approved: true; editedValue?: string } | { approved: false }) {
  const s = useStore.getState();
  const req = s.confirm;
  if (!req) return;

  s.setConfirm(null);

  if (resolver) {
    resolver(r);
    return;
  }
  // Tool already timed out. Apply the effect directly.
  if (r.approved) {
    req.onLateApprove(r.editedValue);
    s.pushActivity({ tool: "", text: `You approved: ${req.title}`, kind: "confirm" });
  } else {
    s.pushActivity({ tool: "", text: `You declined: ${req.title}`, kind: "confirm" });
  }
}

/** Standard status mapping so every confirm-tier tool returns the same vocabulary. */
export function statusFromResult(r: ConfirmResult):
  | "declined_by_user"
  | "pending_user_confirmation"
  | "busy"
  | null {
  if ("busy" in r) return "busy";
  if ("timeout" in r) return "pending_user_confirmation";
  if (!r.approved) return "declined_by_user";
  return null; // approved — caller applies the effect and returns its own success status
}
