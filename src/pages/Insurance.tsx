import { useStore, selectors } from "../store";
import Highlightable from "../components/Highlightable";
import { TODAY_ISO, formatDate } from "../components/format";

/** "$1,240" — whole dollars, the way a statement prints them. */
function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

const YEAR = TODAY_ISO.slice(0, 4);

/**
 * One running total against an annual limit. The bar is a proportion, nothing
 * more: no gradient, no rounded cap, no animation. The sentence underneath is
 * the part a person actually reads.
 */
function Progress({
  label,
  annual,
  met,
}: {
  label: string;
  annual: number;
  met: number;
}) {
  const complete = annual > 0 && met >= annual;
  const pct = annual > 0 ? Math.min(100, Math.max(0, (met / annual) * 100)) : 0;
  const remaining = Math.max(0, annual - met);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[16px] text-ink">{label}</p>
        <p className="tnum ml-auto text-[16px] text-ink">
          {money(met)} of {money(annual)}
        </p>
        {complete && (
          <p className="tnum shrink-0 text-[14px] font-bold text-teal">Met for {YEAR}</p>
        )}
      </div>
      <div aria-hidden="true" className="mt-2 h-[6px] w-full rounded-[2px] bg-line">
        <div className="h-full rounded-[2px] bg-teal" style={{ width: `${pct}%` }} />
      </div>
      {!complete && (
        <p className="tnum mt-2 text-[14px] text-ink-soft">
          {money(remaining)} to go before the plan covers the rest this year.
        </p>
      )}
    </div>
  );
}

/**
 * Coverage and claims. Read-only on purpose: an appeal is a formal document
 * filed with the plan, so this page tells you the deadline and gets out of the
 * way. There is no appeal button here, and there is no tool behind one either.
 */
export default function Insurance() {
  const patientId = useStore((s) => s.currentPatient);
  const insurance = useStore((s) => s.insurance);
  const claims = useStore((s) => s.claims);
  const patients = useStore((s) => s.patients);

  const patient = patients.find((p) => p.id === patientId)!;
  const plan = insurance.find((i) => i.patientId === patientId)!;
  const list = claims
    .filter((c) => c.patientId === patientId)
    .sort((a, b) => Date.parse(b.serviceDate) - Date.parse(a.serviceDate));

  return (
    <div>
      <h1 className="text-[28px] font-bold leading-tight text-ink">Insurance</h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        Coverage and processed claims for {patient.name}.
      </p>

      <section className="mt-8 border-t border-line py-4">
        <p className="text-[18px] font-bold text-ink">{plan.planName}</p>
        {plan.supplementName && (
          <p className="mt-1 text-[16px] text-ink">with {plan.supplementName}</p>
        )}
        <p className="mt-1 text-[14px] text-ink-soft">
          Member ID <span className="tnum text-ink">{plan.memberId}</span>
        </p>
        <p className="tnum mt-1 text-[14px] text-ink-soft">
          In effect since {plan.effectiveSince.slice(0, 4)}
        </p>

        <div className="mt-5 flex max-w-[420px] flex-col gap-5">
          <Progress
            label="Deductible"
            annual={plan.deductible.annual}
            met={plan.deductible.met}
          />
          <Progress
            label="Out-of-pocket maximum"
            annual={plan.outOfPocketMax.annual}
            met={plan.outOfPocketMax.met}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[18px] font-bold text-ink">Claims</h2>

        {list.length === 0 ? (
          <p className="mt-2 border-y border-line py-4 text-[16px] text-ink-soft">
            No claims have been processed for {patient.name} yet.
          </p>
        ) : (
          <ul className="mt-2">
            {list.map((claim) => (
              <li key={claim.id}>
                <Highlightable kind="claim" id={claim.id}>
                  <div className="flex flex-wrap gap-6 border-t border-line py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[18px] font-bold text-ink">{claim.description}</p>
                      <p className="tnum mt-1 text-[14px] text-ink-soft">
                        {selectors.providerName(claim.providerId)} on{" "}
                        {formatDate(claim.serviceDate)}
                      </p>

                      {claim.status === "paid" && (
                        <p className="tnum mt-2 text-[14px] text-ink-soft">
                          {claim.patientOwes === 0
                            ? "Paid by the plan"
                            : `The plan paid ${money(claim.planPaid)} of ${money(claim.billed)}`}
                        </p>
                      )}

                      {claim.status === "processing" && (
                        <p className="mt-2 text-[14px] text-ink-soft">Still being processed</p>
                      )}

                      {claim.status === "denied" && (
                        <>
                          <p className="mt-2 text-[16px] leading-relaxed text-ink">
                            <span className="font-bold text-ochre">Denied.</span>{" "}
                            {claim.denialReason}
                          </p>
                          {claim.appealDeadline && (
                            <p className="tnum mt-1 text-[14px] font-bold text-ochre">
                              Appeal by {formatDate(claim.appealDeadline)}
                            </p>
                          )}
                          <p className="mt-1 text-[14px] text-ink-soft">
                            An appeal has to be filed with the plan directly. It cannot be done
                            from this page.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={[
                          "tnum text-[16px]",
                          claim.patientOwes > 0 ? "font-bold text-ink" : "text-ink-soft",
                        ].join(" ")}
                      >
                        {money(claim.patientOwes)}
                      </p>
                      <p className="mt-1 text-[14px] text-ink-soft">You owe</p>
                    </div>
                  </div>
                </Highlightable>
              </li>
            ))}
            <li className="border-t border-line" />
          </ul>
        )}
      </section>
    </div>
  );
}
