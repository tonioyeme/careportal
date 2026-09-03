import { useStore, selectors } from "../store";
import Highlightable from "../components/Highlightable";
import { daysLeftLabel } from "../components/format";

/**
 * Rows, not cards. There is deliberately no "Request refill" button here:
 * a refill is submitted through the agent's confirmation card, which is the
 * whole point of the demo.
 */
export default function Medications() {
  const patientId = useStore((s) => s.currentPatient);
  const medications = useStore((s) => s.medications);
  const patients = useStore((s) => s.patients);

  const patient = patients.find((p) => p.id === patientId)!;
  const list = medications
    .filter((m) => m.patientId === patientId)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <div>
      <h1 className="text-[28px] font-bold leading-tight text-ink">Medications</h1>
      <p className="mt-2 text-[14px] text-ink-soft">Active prescriptions for {patient.name}.</p>

      {list.length === 0 ? (
        <p className="mt-8 border-y border-line py-4 text-[16px] text-ink-soft">
          No active medications.
        </p>
      ) : (
        <ul className="mt-8">
          {list.map((med) => {
            const low = med.daysRemaining < 7;
            return (
              <li key={med.id}>
                <Highlightable kind="medication" id={med.id}>
                  <div className="flex gap-6 border-t border-line py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[18px] font-bold text-ink">
                        {med.name} {med.dose}
                      </p>
                      <p className="mt-1 text-[16px] text-ink">{med.instructions}</p>
                      <p className="mt-1 text-[14px] text-ink-soft">
                        Prescribed by {selectors.providerName(med.prescriberId)}
                      </p>
                      {med.refillStatus === "requested" && (
                        <p className="mt-2 text-[14px] font-bold text-teal">Refill requested</p>
                      )}
                      {!med.refillable && med.refillStatus !== "requested" && (
                        <p className="mt-2 text-[14px] text-ink-soft">
                          Needs prescriber approval
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={[
                          "tnum text-[16px]",
                          low ? "font-bold text-ochre" : "text-ink",
                        ].join(" ")}
                      >
                        {daysLeftLabel(med.daysRemaining)}
                      </p>
                    </div>
                  </div>
                </Highlightable>
              </li>
            );
          })}
          <li className="border-t border-line" />
        </ul>
      )}
    </div>
  );
}
