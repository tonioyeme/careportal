import { useEffect, useRef, useState } from "react";
import { useStore, type ConfirmRequest } from "../store";
import { resolveConfirm } from "./confirm";

/**
 * The confirmation card. Always mounted at the app root; renders nothing until
 * a tool calls showConfirm().
 *
 * Deliberate omissions:
 *  - no countdown. The 60s timeout lives entirely in confirm.ts and is the
 *    agent's problem, not a source of pressure on the user.
 *  - the card never closes itself. Backdrop clicks and Escape do nothing.
 *    The only exits are the two buttons, because a dangling promise on the
 *    tool side is worse than a modal that insists on an answer.
 *  - approving after the tool already timed out is handled inside
 *    resolveConfirm (it calls req.onLateApprove); nothing special here.
 */
export default function ConfirmCard() {
  const confirm = useStore((s) => s.confirm);
  if (!confirm) return null;
  // Keyed on the request id so every new request gets a fresh textarea.
  return <ConfirmCardBody key={confirm.id} confirm={confirm} />;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ConfirmCardBody({ confirm }: { confirm: ConfirmRequest }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(confirm.editable?.value ?? "");

  // Focus moves into the card when it opens: the textarea if there is one to
  // edit, otherwise the primary button.
  useEffect(() => {
    const target = textareaRef.current ?? primaryRef.current;
    target?.focus();
    if (textareaRef.current) {
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      // Escape does NOT close this card. Swallow it so nothing upstream acts on it.
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key !== "Tab") return;
    const root = cardRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !root.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !root.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  const titleId = `confirm-title-${confirm.id}`;
  const detailId = `confirm-detail-${confirm.id}`;
  const editableId = `confirm-editable-${confirm.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 animate-fadeIn">
      {/* Backdrop click intentionally does nothing — a promise is waiting on an answer. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detailId}
        onKeyDown={onKeyDown}
        className="w-[440px] max-w-full border-t-4 border-agent bg-paper px-6 pb-5 pt-4 shadow-[0_12px_40px_rgba(24,47,43,0.18)] animate-cardIn"
      >
        <p className="text-[14px] text-ink-soft">Your agent is asking you to confirm</p>

        <h2 id={titleId} className="mt-2 text-[20px] font-bold leading-snug text-ink">
          {confirm.title}
        </h2>

        <p id={detailId} className="mt-2 text-[16px] leading-relaxed text-ink">
          {confirm.detail}
        </p>

        {confirm.editable && (
          <div className="mt-5">
            <label htmlFor={editableId} className="block text-[14px] text-ink-soft">
              {confirm.editable.label}
            </label>
            <textarea
              id={editableId}
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={5}
              className="mt-1 w-full resize-none rounded-none border-0 border-b border-line bg-transparent px-0 py-1 text-[16px] leading-relaxed text-ink outline-none focus:border-line"
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => resolveConfirm({ approved: false })}
            className="px-3 py-2 text-[16px] text-ink-soft hover:text-ink"
          >
            Decline
          </button>
          <button
            type="button"
            ref={primaryRef}
            onClick={() =>
              resolveConfirm(
                confirm.editable
                  ? { approved: true, editedValue: value }
                  : { approved: true },
              )
            }
            className="bg-teal px-4 py-2 text-[16px] font-bold text-white hover:opacity-90"
          >
            {confirm.primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
