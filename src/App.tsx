import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "./store";
import { bootstrapWebMCP } from "./webmcp/register";
import TopBar from "./components/TopBar";
import SideNav from "./components/SideNav";
import AgentRail from "./components/AgentRail";
import ConfirmCard from "./confirm/ConfirmCard";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Appointments from "./pages/Appointments";
import AppointmentDetail from "./pages/AppointmentDetail";
import Medications from "./pages/Medications";
import Results from "./pages/Results";
import Todo from "./pages/Todo";

/**
 * Tools live outside React and cannot reach the router, so they publish a
 * navigation intent onto the store and this effect performs it.
 */
function NavBridge() {
  const navRequest = useStore((s) => s.navRequest);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!navRequest) return;
    if (navRequest.path !== location.pathname) navigate(navRequest.path);
    // nonce in the dependency list so two calls to the same path still fire
  }, [navRequest?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function App() {
  const loggedIn = useStore((s) => s.loggedIn);

  useEffect(() => bootstrapWebMCP(), []);

  if (!loggedIn) {
    return (
      <>
        <NavBridge />
        <Login />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-mist text-ink">
      <NavBridge />
      <TopBar />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-stretch lg:flex-row">
        <SideNav />
        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[720px]">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/appointments/:id" element={<AppointmentDetail />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/results" element={<Results />} />
              <Route path="/todo" element={<Todo />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
        <AgentRail />
      </div>
      <ConfirmCard />
    </div>
  );
}
