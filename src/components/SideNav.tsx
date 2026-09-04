import { Link, useLocation } from "react-router-dom";
import { useStore } from "../store";

/**
 * Six destinations, 200px, fixed. An ochre dot means "there is something here
 * that needs you" for the patient you are currently managing.
 */
export default function SideNav() {
  const { pathname } = useLocation();
  const patientId = useStore((s) => s.currentPatient);
  const medications = useStore((s) => s.medications);
  const threads = useStore((s) => s.threads);
  const documents = useStore((s) => s.documents);
  const claims = useStore((s) => s.claims);

  const lowMeds = medications.some((m) => m.patientId === patientId && m.daysRemaining < 7);
  const unread = threads.some(
    (t) => t.patientId === patientId && t.messages.some((m) => !m.read && m.from === "provider"),
  );
  const unsigned = documents.some((d) => d.patientId === patientId && !d.signed);
  const denied = claims.some((c) => c.patientId === patientId && c.status === "denied");

  const items: { to: string; label: string; attention: boolean }[] = [
    { to: "/", label: "Overview", attention: false },
    { to: "/appointments", label: "Appointments", attention: false },
    { to: "/medications", label: "Medications", attention: lowMeds },
    { to: "/results", label: "Results", attention: unread },
    { to: "/insurance", label: "Insurance", attention: denied },
    { to: "/todo", label: "To do", attention: unsigned },
  ];

  const isCurrent = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <nav
      aria-label="Portal sections"
      className="w-full shrink-0 border-b border-line lg:w-[200px] lg:border-b-0 lg:border-r"
    >
      <ul className="flex flex-row overflow-x-auto px-2 py-1 lg:sticky lg:top-16 lg:flex-col lg:overflow-visible lg:px-0 lg:py-8">
        {items.map((item) => {
          const current = isCurrent(item.to);
          return (
            <li key={item.to} className="shrink-0">
              <Link
                to={item.to}
                aria-current={current ? "page" : undefined}
                className={[
                  "flex items-center gap-2 whitespace-nowrap px-3 py-2 text-[16px] lg:px-4 lg:pl-6",
                  current ? "font-bold text-teal" : "text-ink hover:text-teal",
                ].join(" ")}
              >
                <span>{item.label}</span>
                {item.attention && (
                  <span
                    className="ml-auto h-2 w-2 shrink-0 rounded-full bg-ochre"
                    role="img"
                    aria-label="needs your attention"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
