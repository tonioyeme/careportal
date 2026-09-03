import { useEffect, useState } from "react";
import { useStore, selectors } from "../store";
import Highlightable from "../components/Highlightable";
import { formatDate, formatStamp } from "../components/format";
import type { MessageThread } from "../data/types";

/** One provider conversation, collapsible, wrapped so the agent can point at it. */
function ThreadRow({
  thread,
  expanded,
  onToggle,
}: {
  thread: MessageThread;
  expanded: boolean;
  onToggle: () => void;
}) {
  const unread = thread.messages.filter((m) => !m.read && m.from === "provider").length;

  return (
    <Highlightable kind="thread" id={thread.id}>
      <div className="border-t border-line py-3">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={onToggle}
          className="flex w-full items-baseline gap-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="text-[16px] font-bold text-ink">{thread.subject}</span>
            <span className="ml-2 text-[14px] text-ink-soft">
              with {selectors.providerName(thread.providerId)}
            </span>
          </span>
          {unread > 0 && (
            <span className="tnum shrink-0 text-[14px] font-bold text-ochre">{unread} unread</span>
          )}
          <span className="shrink-0 text-[14px] text-teal">
            {expanded ? "Hide messages" : "Show messages"}
          </span>
        </button>

        {expanded && (
          <ul className="mt-3 flex flex-col gap-4">
            {thread.messages.map((m) => (
              <li key={m.id} className="border-l-2 border-line pl-4">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[14px] font-bold text-ink">
                    {m.from === "provider" ? selectors.providerName(thread.providerId) : "You"}
                  </span>
                  <span className="tnum text-[14px] text-ink-soft">{formatStamp(m.at)}</span>
                  {!m.read && m.from === "provider" && (
                    <span className="flex items-center gap-1 text-[14px] font-bold text-ochre">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ochre" />
                      Unread
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[16px] leading-relaxed text-ink">{m.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Highlightable>
  );
}

/**
 * Lab results, with the provider conversation about a result sitting directly
 * underneath it. That adjacency is what lets one sentence to the agent cover
 * "did the results come back, and what did the doctor say".
 */
export default function Results() {
  const patientId = useStore((s) => s.currentPatient);
  const results = useStore((s) => s.results);
  const threads = useStore((s) => s.threads);
  const patients = useStore((s) => s.patients);
  const highlight = useStore((s) => s.highlight);

  const patient = patients.find((p) => p.id === patientId)!;

  const list = results
    .filter((r) => r.patientId === patientId)
    .sort((a, b) => Date.parse(b.collectedAt) - Date.parse(a.collectedAt));

  const patientThreads = threads.filter((t) => t.patientId === patientId);
  const looseThreads = patientThreads.filter(
    (t) => !t.relatedResultId || !list.some((r) => r.id === t.relatedResultId),
  );

  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Anything with an unread provider message starts expanded.
  useEffect(() => {
    const unreadIds = threads
      .filter((t) => t.patientId === patientId)
      .filter((t) => t.messages.some((m) => !m.read && m.from === "provider"))
      .map((t) => t.id);
    if (unreadIds.length === 0) return;
    setOpen((prev) => {
      if (unreadIds.every((id) => prev[id])) return prev;
      const next = { ...prev };
      for (const id of unreadIds) next[id] = true;
      return next;
    });
  }, [threads, patientId]);

  // A thread the agent points at must be open, whatever the reader did before.
  useEffect(() => {
    if (highlight?.kind !== "thread") return;
    const id = highlight.id;
    setOpen((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, [highlight]);

  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div>
      <h1 className="text-[28px] font-bold leading-tight text-ink">Results</h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        Lab results for {patient.name}, with any messages your care team sent about them.
      </p>

      {list.length === 0 ? (
        <p className="mt-8 border-y border-line py-4 text-[16px] text-ink-soft">No results yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col">
          {list.map((res) => {
            const related = patientThreads.filter((t) => t.relatedResultId === res.id);
            return (
              <li key={res.id} className="mb-6">
                <Highlightable kind="result" id={res.id}>
                  <div className="flex gap-6 border-t border-line py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[18px] font-bold text-ink">{res.name}</p>
                      <p className="mt-1 text-[14px] text-ink-soft">
                        Ordered by {selectors.providerName(res.orderedById)}
                      </p>
                      <p className="mt-2 text-[16px] leading-relaxed text-ink">{res.summary}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-[14px] text-ink-soft">
                        Collected {formatDate(res.collectedAt)}
                      </p>
                      <p className="mt-1 text-[16px] text-ink">
                        {res.status === "final" ? "Final" : "Pending"}
                      </p>
                      {res.flagged && (
                        <p className="mt-1 text-[14px] font-bold text-ochre">Outside normal range</p>
                      )}
                    </div>
                  </div>
                </Highlightable>

                {related.length > 0 && (
                  <ul className="ml-10">
                    {related.map((t) => (
                      <li key={t.id}>
                        <ThreadRow
                          thread={t}
                          expanded={!!open[t.id]}
                          onToggle={() => toggle(t.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="mt-4">
        <h2 className="text-[18px] font-bold text-ink">Other messages</h2>
        {looseThreads.length === 0 ? (
          <p className="mt-2 border-y border-line py-4 text-[16px] text-ink-soft">
            No other messages waiting for you.
          </p>
        ) : (
          <ul className="mt-2">
            {looseThreads.map((t) => (
              <li key={t.id}>
                <ThreadRow thread={t} expanded={!!open[t.id]} onToggle={() => toggle(t.id)} />
              </li>
            ))}
            <li className="border-t border-line" />
          </ul>
        )}
      </section>
    </div>
  );
}
