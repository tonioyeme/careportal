import { Link, Navigate, useParams } from "react-router-dom";
import { useStore } from "../store";
import Highlightable from "../components/Highlightable";
import { formatDayTime, relativeDay, specialtyLabel } from "../components/format";

/**
 * The only route-scoped page: while it is open, the WebMCP layer registers
 * `reschedule_appointment` bound to this appointment. The available slots are
 * shown but are not clickable — moving the appointment goes through the
 * agent's confirmation card, the same way a refill does.
 */
export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const patientId = useStore((s) => s.currentPatient);
  const appointments = useStore((s) => s.appointments);
  const providers = useStore((s) => s.providers);

  const appt = appointments.find((a) => a.id === id);

  if (!appt || appt.patientId !== patientId) {
    return <Navigate to="/appointments" replace />;
  }

  const provider = providers.find((p) => p.id === appt.providerId);

  return (
    <div>
      <Link to="/appointments" className="text-[14px] text-teal hover:underline">
        Back to appointments
      </Link>

      <Highlightable kind="appointment" id={appt.id} className="mt-4">
        <h1 className="text-[28px] font-bold leading-tight text-ink">{appt.type}</h1>
        <p className="tnum mt-2 text-[16px] text-ink">
          {formatDayTime(appt.datetime)}, {relativeDay(appt.datetime)}
        </p>

        <dl className="mt-6">
          <div className="flex gap-6 border-t border-line py-3">
            <dt className="w-[160px] shrink-0 text-[14px] text-ink-soft">Provider</dt>
            <dd className="text-[16px] text-ink">
              {provider ? `${provider.name}, ${specialtyLabel(provider.specialty)}` : "Unassigned"}
            </dd>
          </div>
          <div className="flex gap-6 border-t border-line py-3">
            <dt className="w-[160px] shrink-0 text-[14px] text-ink-soft">Location</dt>
            <dd className="text-[16px] text-ink">{provider?.location ?? "To be confirmed"}</dd>
          </div>
          <div className="flex gap-6 border-t border-line py-3">
            <dt className="w-[160px] shrink-0 text-[14px] text-ink-soft">Coverage</dt>
            <dd className="text-[16px] text-ink">
              {provider?.inNetwork ? "In network" : "Out of network"}
            </dd>
          </div>
          <div className="flex gap-6 border-y border-line py-3">
            <dt className="w-[160px] shrink-0 text-[14px] text-ink-soft">Status</dt>
            <dd className="text-[16px] text-ink">
              {appt.status === "scheduled" ? "Scheduled" : "Completed"}
            </dd>
          </div>
        </dl>
      </Highlightable>

      <section className="mt-10">
        <h2 className="text-[18px] font-bold text-ink">Other available times</h2>
        <p className="mt-1 text-[14px] text-ink-soft">
          Your agent can move this appointment to one of these times. It will ask you to confirm
          before anything changes.
        </p>

        {appt.availableSlots.length === 0 ? (
          <p className="mt-4 border-y border-line py-4 text-[16px] text-ink-soft">
            No other times are open with this provider right now.
          </p>
        ) : (
          <ul className="mt-4">
            {appt.availableSlots.map((slot) => (
              <li key={slot} className="tnum border-t border-line py-3 text-[16px] text-ink">
                {formatDayTime(slot)}
                <span className="ml-2 text-[14px] text-ink-soft">({relativeDay(slot)})</span>
              </li>
            ))}
            <li className="border-t border-line" />
          </ul>
        )}
      </section>
    </div>
  );
}
