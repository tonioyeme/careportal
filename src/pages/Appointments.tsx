import { Link } from "react-router-dom";
import { useStore } from "../store";
import Highlightable from "../components/Highlightable";
import { formatDay, formatTime, relativeDay, specialtyLabel } from "../components/format";

export default function Appointments() {
  const patientId = useStore((s) => s.currentPatient);
  const appointments = useStore((s) => s.appointments);
  const providers = useStore((s) => s.providers);
  const patients = useStore((s) => s.patients);

  const patient = patients.find((p) => p.id === patientId)!;
  const list = appointments
    .filter((a) => a.patientId === patientId && a.status === "scheduled")
    .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));

  return (
    <div>
      <h1 className="text-[28px] font-bold leading-tight text-ink">Appointments</h1>
      <p className="mt-2 text-[14px] text-ink-soft">Scheduled visits for {patient.name}.</p>

      {list.length === 0 ? (
        <p className="mt-8 border-y border-line py-4 text-[16px] text-ink-soft">
          No appointments are scheduled.
        </p>
      ) : (
        <ul className="mt-8">
          {list.map((appt) => {
            const provider = providers.find((p) => p.id === appt.providerId);
            return (
              <li key={appt.id}>
                <Highlightable kind="appointment" id={appt.id}>
                  <Link
                    to={`/appointments/${appt.id}`}
                    className="flex gap-6 border-t border-line py-4 hover:bg-paper"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[18px] font-bold text-ink">{appt.type}</p>
                      <p className="mt-1 text-[16px] text-ink">
                        {provider ? provider.name : "Provider to be assigned"}
                        {provider ? `, ${specialtyLabel(provider.specialty)}` : ""}
                      </p>
                      <p className="mt-1 text-[14px] text-ink-soft">
                        {provider?.location ?? "Location to be confirmed"}
                      </p>
                      <p className="mt-1 text-[14px] text-ink-soft">
                        {provider?.inNetwork ? "In network" : "Out of network"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-[16px] text-ink">{formatDay(appt.datetime)}</p>
                      <p className="tnum mt-1 text-[16px] text-ink">{formatTime(appt.datetime)}</p>
                      <p className="tnum mt-1 text-[14px] text-ink-soft">
                        {relativeDay(appt.datetime)}
                      </p>
                    </div>
                  </Link>
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
