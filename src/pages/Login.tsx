import { useStore } from "../store";

/**
 * Full screen, no portal chrome. The credentials are shown filled in and
 * locked: an agent cannot and should not sign in for you, and a judge should
 * not have to type anything.
 */
export default function Login() {
  const login = useStore((s) => s.login);

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-6 py-12">
      <div className="w-full max-w-[400px]">
        <p className="text-[18px] font-bold tracking-tight text-ink">CarePortal</p>
        <p className="mt-1 text-[14px] text-ink-soft">Hackensack Health</p>

        <h1 className="mt-10 text-[28px] font-bold leading-tight text-ink">Sign in</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">
          This is a demo patient portal built for a WebMCP submission. Nothing here is a real
          record, and no password is needed.
        </p>

        <form
          className="mt-8 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-[14px] text-ink-soft">Username</span>
            <input
              type="text"
              name="username"
              value="linda"
              readOnly
              autoComplete="username"
              className="w-full rounded-sm border border-line bg-mist px-3 py-2 text-[16px] text-ink-soft"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[14px] text-ink-soft">Password</span>
            <input
              type="password"
              name="password"
              value="demo"
              readOnly
              autoComplete="current-password"
              className="w-full rounded-sm border border-line bg-mist px-3 py-2 text-[16px] text-ink-soft"
            />
          </label>

          <button
            type="submit"
            className="mt-1 w-full rounded-sm bg-teal px-4 py-3 text-[16px] font-bold text-paper hover:bg-[#175753]"
          >
            Sign in as Linda (demo)
          </button>
        </form>
      </div>
    </div>
  );
}
