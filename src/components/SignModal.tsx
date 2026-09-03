import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";

/**
 * Signature modal, opened from the to-do page when a document row is clicked.
 *
 * There is deliberately NO WebMCP tool for signing. A signature is a legal act
 * by a person; the agent can find the document and bring the user here
 * (what_requires_me), but it can never sign. That gap is the point.
 *
 * Same physical surface as the confirmation card, with one difference: the top
 * border is ochre, not agent purple, because this action belongs to the human.
 * Unlike the confirmation card, nothing is awaiting a promise here, so Escape,
 * Cancel and a backdrop click all close it.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function SignModal({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const doc = useStore((s) => s.documents.find((d) => d.id === documentId));
  const cardRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    nameRef.current?.focus();
  }, [documentId]);

  if (!doc) return null;

  const canSign = name.trim().length > 0 && agreed;

  function sign() {
    if (!doc || !canSign) return;
    const store = useStore.getState();
    store.signDocument(documentId, name.trim());
    // The agent rail shows the human's step alongside the agent's.
    store.pushActivity({ tool: "", text: `You signed: ${doc.title}`, kind: "handoff" });
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
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

  const titleId = `sign-title-${doc.id}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="w-[440px] max-w-full border-t-4 border-ochre bg-paper px-6 pb-5 pt-4 shadow-[0_12px_40px_rgba(24,47,43,0.18)] animate-cardIn"
      >
        <p className="text-[14px] text-ink-soft">You are signing this yourself</p>

        <h2 id={titleId} className="mt-2 text-[20px] font-bold leading-snug text-ink">
          {doc.title}
        </h2>

        <p className="mt-3 max-h-48 overflow-y-auto border-l-2 border-line pl-3 text-[14px] leading-relaxed text-ink-soft">
          {doc.excerpt}
        </p>

        <div className="mt-5">
          <label htmlFor={`sign-name-${doc.id}`} className="block text-[14px] text-ink-soft">
            Type your full name
          </label>
          <input
            id={`sign-name-${doc.id}`}
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            className="mt-1 w-full rounded-none border-0 border-b border-line bg-transparent px-0 py-1 text-[16px] text-ink outline-none"
          />
        </div>

        <label className="mt-4 flex items-start gap-2 text-[14px] leading-relaxed text-ink">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[#B0761C]"
          />
          <span>I am the patient or an authorized proxy</span>
        </label>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-[16px] text-ink-soft hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={sign}
            disabled={!canSign}
            className="bg-teal px-4 py-2 text-[16px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sign
          </button>
        </div>
      </div>
    </div>
  );
}
