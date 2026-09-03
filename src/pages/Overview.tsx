import { Link } from "react-router-dom";
import { useStore, selectors } from "../store";
import { daysLeftLabel, formatDayTime, plural, relativeDay } from "../components/format";

/**
 * One screen that answers "what is going on with the person I care for".
 * Every block is a link into the module that owns it.
 */
export default function Overview() {
  const patientId = useStore((s) => s.currentPatient);
  const patients = useStore((s) => s.patients);
  const appointments = useStore((s) => s.appointments);
  const medications = useStore((s) => s.medications);
  const threads = useStore((s) => s.threads);
  const documents = useStore((s) => s.documents);

  const patient = patients.find((p) => p.id === patientId)!;

  const nextAppointment = appointments
    .filter((a) => a.patientId === patientId && a.status === "scheduled")
    .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime))[0];

  const lowMeds = medications
    .filter((m) => m.patientId === patientId && m.daysRemaining < 7)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const unread = threads
    .filter((t) => t.patientId === patientId)
    .flatMap((t) => t.messages.filter((m) => !m.read && m.from === "provider"));

  const unsigned = documents.filter((d) => d.patientId === patientId && !d.signed);

  return (
    <div>
      <h1 className="text-[28px] font-bold leading-tight text-ink">Overview</h1>

      <div className="mt-5 border-l-[3px] border-teal bg-paper px-4 py-3">
        <p className="text-[18px] font-bold text-ink">Managing care for {patient.name}</p>
        <p className="mt-1 text-[14px] text-ink-soft">
          {patient.relationshipToUser === "proxy"
            ? "You have proxy access to this record. You can view information, request refills, and message providers on their behalf."
            : "This is your own record."}
        </p>
      </div>

      <section className="mt-10">
        <ul>
          {/* Next appointment ------------------------------------------- */}
          <li>
            <Link to="/appointments" className="block border-t border-line py-4 hover:bg-paper">
              <p className="text-[18px] font-bold text-ink">Next appointment</p>
              {nextAppointment ? (
                <>
                  <p className="mt-1 text-[16px] text-ink">
                    {nextAppointment.type} with {selectors.providerName(nextAppointment.providerId)}
                  </p>
                  <p className="tnum mt-1 text-[14px] text-ink-soft">
                    {formatDayTime(nextAppointment.datetime)}, {relativeDay(nextAppointment.datetime)}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[16px] text-ink-soft">Nothing scheduled.</p>
              )}
            </Link>
          </li>

          {/* Medications running low ------------------------------------ */}
          <li>
            <Link to="/medications" className="block border-t border-line py-4 hover:bg-paper">
              <p className="text-[18px] font-bold text-ink">Medications running low</p>
              {lowMeds.length === 0 ? (
                <p className="mt-1 text-[16px] text-ink-soft">
                  Everything has more than a week of supply left.
                </p>
              ) : (
                <>
                  <p className="tnum mt-1 text-[16px] font-bold text-ochre">
                    {plural(lowMeds.length, "medication has", "medications have")} fewer than 7 days
                    left
                  </p>
                  <p className="tnum mt-1 text-[14px] text-ink-soft">
                    {lowMeds
                      .map((m) => `${m.name} ${m.dose}, ${daysLeftLabel(m.daysRemaining)}`)
                      .join("; ")}
                  </p>
                </>
              )}
            </Link>
          </li>

          {/* Messages ---------------------------------------------------- */}
          <li>
            <Link to="/results" className="block border-t border-line py-4 hover:bg-paper">
              <p className="text-[18px] font-bold text-ink">Messages from providers</p>
              {unread.length === 0 ? (
                <p className="mt-1 text-[16px] text-ink-soft">No messages waiting for you.</p>
              ) : (
                <p className="tnum mt-1 text-[16px] font-bold text-ochre">
                  {plural(unread.length, "unread message", "unread messages")}
                </p>
              )}
            </Link>
          </li>

          {/* Signatures --------------------------------------------------- */}
          <li>
            <Link to="/todo" className="block border-t border-line py-4 hover:bg-paper">
              <p className="text-[18px] font-bold text-ink">Waiting for your signature</p>
              {unsigned.length === 0 ? (
                <p className="mt-1 text-[16px] text-ink-soft">Nothing to sign.</p>
              ) : (
                <>
                  <p className="tnum mt-1 text-[16px] font-bold text-ochre">
                    {plural(unsigned.length, "document", "documents")} awaiting signature
                  </p>
                  <p className="mt-1 text-[14px] text-ink-soft">
                    {unsigned.map((d) => d.title).join("; ")}
                  </p>
                </>
              )}
            </Link>
          </li>

          {/* Insurance ---------------------------------------------------- */}
          <li className="border-y border-line py-4">
            <p className="text-[18px] font-bold text-ink">Insurance</p>
            <p className="mt-1 text-[16px] text-ink">{patient.insuranceLine}</p>
          </li>
        </ul>
      </section>
    </div>
  );
}
