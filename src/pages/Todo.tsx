import { useState } from "react";
import { useStore } from "../store";
import Highlightable from "../components/Highlightable";
import SignModal from "../components/SignModal";
import { formatDate, formatStamp, parseSignature, relativeDay } from "../components/format";

/**
 * The handoff page. Everything here is something only a person can do — a
 * legal signature has no WebMCP tool behind it, on purpose. The agent can
 * bring you here and point at the document; it cannot sign it.
 */
export default function Todo() {
  const patientId = useStore((s) => s.currentPatient);
  const documents = useStore((s) => s.documents);
  const patients = useStore((s) => s.patients);

  const patient = patients.find((p) => p.id === patientId)!;
  const mine = documents.filter((d) => d.patientId === patientId);
  const pending = mine
    .filter((d) => !d.signed)
    .sort((a, b) => Date.parse(a.dueBy) - Date.parse(b.dueBy));
  const done = mine.filter((d) => d.signed);

  const [signingId, setSigningId] = useState<string | null>(null);

  return (
    <div>
      <h1 className="text-[28px] font-bold leading-tight text-ink">To do</h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        Things only you can do for {patient.name}. Your agent can find these, but it cannot sign
        anything on your behalf.
      </p>

      {pending.length === 0 ? (
        <p className="mt-8 border-y border-line py-4 text-[16px] text-ink-soft">
          Nothing is waiting for you right now.
        </p>
      ) : (
        <ul className="mt-8">
          {pending.map((doc) => (
            <li key={doc.id}>
              <Highlightable kind="document" id={doc.id}>
                <div className="flex flex-wrap items-start gap-6 border-t border-line py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[18px] font-bold text-ink">{doc.title}</p>
                    <p className="mt-1 text-[16px] text-ink">
                      Requires signature by{" "}
                      {doc.requiresSignatureBy === "proxy"
                        ? "an authorized proxy"
                        : "the patient"}
                    </p>
                    <p className="tnum mt-1 text-[14px] font-bold text-ochre">
                      Due {formatDate(doc.dueBy)} ({relativeDay(doc.dueBy)})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSigningId(doc.id)}
                    className="shrink-0 rounded-sm bg-teal px-4 py-2 text-[16px] font-bold text-paper hover:bg-[#175753]"
                  >
                    Review and sign
                  </button>
                </div>
              </Highlightable>
            </li>
          ))}
          <li className="border-t border-line" />
        </ul>
      )}

      {done.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[18px] font-bold text-ink">Already signed</h2>
          <ul className="mt-2">
            {done.map((doc) => {
              const sig = parseSignature(doc.signedAt);
              return (
                <li key={doc.id}>
                  <Highlightable kind="document" id={doc.id}>
                    <div className="border-t border-line py-4">
                      <p className="text-[16px] font-bold text-ink">{doc.title}</p>
                      <p className="tnum mt-1 text-[14px] text-ink-soft">
                        Signed{sig?.by ? ` by ${sig.by}` : ""}
                        {sig?.at ? ` on ${formatStamp(sig.at)}` : ""}
                      </p>
                    </div>
                  </Highlightable>
                </li>
              );
            })}
            <li className="border-t border-line" />
          </ul>
        </section>
      )}

      {signingId && <SignModal documentId={signingId} onClose={() => setSigningId(null)} />}
    </div>
  );
}
