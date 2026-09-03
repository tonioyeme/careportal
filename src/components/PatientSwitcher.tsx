import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import type { PatientId } from "../data/types";

/**
 * "Managing care for [ Margaret Lee ]". Switching returns to the overview;
 * the WebMCP layer watches `currentPatient` and re-registers the patient scope
 * with the new name injected into every tool description.
 */
export default function PatientSwitcher() {
  const patients = useStore((s) => s.patients);
  const current = useStore((s) => s.currentPatient);
  const switchPatient = useStore((s) => s.switchPatient);
  const navigate = useNavigate();

  return (
    <label className="flex min-w-0 items-center gap-3">
      <span className="hidden shrink-0 whitespace-nowrap text-[14px] text-ink-soft md:inline">
        Managing care for
      </span>
      <select
        value={current}
        onChange={(e) => {
          switchPatient(e.target.value as PatientId);
          navigate("/");
        }}
        aria-label="Managing care for"
        className="min-w-0 cursor-pointer truncate rounded-sm border border-line bg-paper px-2 py-1 text-[16px] font-bold text-ink hover:border-teal"
      >
        {patients.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.relationshipToUser === "proxy" ? " (proxy access)" : " (you)"}
          </option>
        ))}
      </select>
    </label>
  );
}
