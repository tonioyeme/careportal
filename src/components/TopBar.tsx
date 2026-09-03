import { useStore } from "../store";
import PatientSwitcher from "./PatientSwitcher";

export default function TopBar() {
  const logout = useStore((s) => s.logout);

  return (
    <header className="sticky top-0 z-20 h-16 shrink-0 border-b border-line bg-paper">
      <div className="mx-auto flex h-full w-full max-w-[1400px] items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <span className="shrink-0 whitespace-nowrap text-[18px] font-bold tracking-tight text-ink">
          CarePortal
        </span>
        <span className="hidden shrink-0 whitespace-nowrap text-[14px] text-ink-soft xl:inline">
          Hackensack Health
        </span>
        <div className="ml-auto flex min-w-0 items-center gap-4 sm:gap-6">
          <PatientSwitcher />
          <button
            type="button"
            onClick={logout}
            className="shrink-0 whitespace-nowrap text-[14px] text-ink-soft hover:text-teal hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
