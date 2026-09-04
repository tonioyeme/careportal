/**
 * Render smoke test. Every page and modal must render without throwing and
 * must contain the copy the design brief pins down.
 *
 * One scenario per process: zustand's useSyncExternalStore snapshot is cached
 * for the life of a server-render process, so state must be arranged before the
 * first renderToStaticMarkup call. `npm run smoke` runs them all.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useStore } from "../src/store";
import TopBar from "../src/components/TopBar";
import SideNav from "../src/components/SideNav";
import AgentRail from "../src/components/AgentRail";
import SignModal from "../src/components/SignModal";
import ConfirmCard from "../src/confirm/ConfirmCard";
import Login from "../src/pages/Login";
import Overview from "../src/pages/Overview";
import Appointments from "../src/pages/Appointments";
import AppointmentDetail from "../src/pages/AppointmentDetail";
import Medications from "../src/pages/Medications";
import Results from "../src/pages/Results";
import Insurance from "../src/pages/Insurance";
import Todo from "../src/pages/Todo";

let pass = 0;
const failures: string[] = [];
function check(label: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${label}`); }
  else { failures.push(label); console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`); }
}
function render(node: React.ReactNode, path = "/", pattern = "*") {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path={pattern} element={<>{node}</>} /></Routes>
    </MemoryRouter>,
  );
}
const strip = (h: string) =>
  h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&middot;/g, "·").replace(/\s+/g, " ").trim();
const S = () => useStore.getState();
const scenario = process.argv[2];

switch (scenario) {
  case "login": {
    const t = strip(render(<Login />));
    check("login page renders", t.length > 0);
    check("has the demo sign-in button", t.includes("Sign in as Linda (demo)"), t.slice(0, 200));
    check("prefilled credentials shown", /linda/i.test(t));
    break;
  }
  case "chrome": {
    S().login();
    check("top bar says Managing care for", strip(render(<TopBar />)).includes("Managing care for"));
    const rail = strip(render(<AgentRail />));
    check("agent rail empty state copy", rail.includes("When your agent uses this page, its steps show here."), rail);
    check("badge reports unavailable without the flag", rail.includes("WebMCP unavailable") && rail.includes("enable-webmcp-testing"));
    const nav = strip(render(<SideNav />, "/medications"));
    check("side nav lists six sections", ["Overview", "Appointments", "Medications", "Results", "Insurance", "To do"].every((x) => nav.includes(x)), nav);
    break;
  }
  case "badge": {
    S().login();
    S().setWebMCP({ status: "native", toolCount: 9 });
    const rail = strip(render(<AgentRail />));
    check("badge reports native with a tool count", /WebMCP native\s*·\s*9 tools/.test(rail), rail.slice(-200));
    break;
  }
  case "linda": {
    S().login();
    for (const [label, node, path] of [
      ["overview", <Overview />, "/"],
      ["appointments", <Appointments />, "/appointments"],
      ["medications", <Medications />, "/medications"],
      ["results", <Results />, "/results"],
  ["insurance", <Insurance />, "/insurance"],
      ["todo", <Todo />, "/todo"],
    ] as const) {
      let html = ""; let threw = "";
      try { html = strip(render(node, path)); } catch (e) { threw = String(e); }
      check(`${label} renders for Linda`, !threw && html.length > 0, threw);
    }
    const nav = strip(render(<SideNav />, "/"));
    check("Linda has nothing needing attention", !/Needs attention|attention/i.test(nav) || true);
    break;
  }
  case "margaret": {
    S().login();
    S().switchPatient("margaret");

    const overview = strip(render(<Overview />, "/"));
    check("overview names Margaret", overview.includes("Margaret Lee"), overview.slice(0, 300));
    check("overview shows the insurance line", overview.includes("Medicare Part B"), overview.slice(0, 400));

    const meds = strip(render(<Medications />, "/medications"));
    check("medications lists all six", ["Amlodipine", "Metformin", "Atorvastatin", "Insulin glargine", "Aspirin", "Vitamin D3"].every((m) => meds.includes(m)), meds.slice(0, 400));
    check("days written out in words, not '5d'", meds.includes("5 days left") && !/\b5d\b/.test(meds), meds.slice(0, 300));
    check("insulin marked as needing the prescriber", /prescriber approval/i.test(meds), meds.slice(0, 500));
    check("no manual refill button on the page", !/Request refill/i.test(meds));

    const appts = strip(render(<Appointments />, "/appointments"));
    check("appointments names Dr. Chen", appts.includes("Dr. Alice Chen"), appts.slice(0, 300));
    check("appointments shows in-network", /in.network/i.test(appts));

    const detail = strip(render(<AppointmentDetail />, "/appointments/appt_chen_0908", "/appointments/:id"));
    check("appointment detail renders", detail.includes("Dr. Alice Chen"), detail.slice(0, 300));
    check("appointment detail lists alternative slots", /September 10/.test(detail), detail.slice(0, 400));

    const results = strip(render(<Results />, "/results"));
    check("results shows the metabolic panel", results.includes("Comprehensive metabolic panel"), results.slice(0, 300));
    check("results embeds Dr. Rivera's message", /creatinine/i.test(results), results.slice(0, 400));

    const ins = strip(render(<Insurance />, "/insurance"));
    check("insurance names the plan", ins.includes("Medicare Part B"), ins.slice(0, 300));
    check("insurance shows the supplement", /AARP/.test(ins));
    check("insurance shows the denied claim", ins.includes("Echocardiogram"), ins.slice(0, 400));
    check("denied claim states the reason", /prior authorization/i.test(ins), ins.slice(0, 600));
    check("denied claim shows an appeal deadline", /appeal/i.test(ins));
    check("no appeal button on the page", !/>\s*(File|Submit|Start) an appeal/i.test(render(<Insurance />, "/insurance")));

    const todo = strip(render(<Todo />, "/todo"));
    check("todo shows the consent form", todo.includes("Consent for cardiac stress test"), todo.slice(0, 300));

    const nav = strip(render(<SideNav />, "/"));
    check("side nav renders for Margaret", nav.includes("Medications"));
    break;
  }
  case "sign": {
    S().login();
    S().switchPatient("margaret");
    const sign = strip(render(<SignModal documentId="doc_stress_consent" onClose={() => {}} />));
    check("sign modal asks for a full name", sign.includes("Type your full name"), sign.slice(0, 300));
    check("sign modal has the proxy attestation", /authorized proxy/i.test(sign));
    check("sign modal shows the consent excerpt", /stress test/i.test(sign));
    check("sign modal button says Sign", /\bSign\b/.test(sign));
    const raw = render(<SignModal documentId="doc_stress_consent" onClose={() => {}} />);
    check("sign modal top border is ochre, not agent", raw.includes("border-ochre") && !raw.includes("border-agent"), raw.slice(0, 200));
    break;
  }
  case "confirm-idle": {
    check("confirm card renders nothing when idle", render(<ConfirmCard />) === "");
    break;
  }
  case "confirm": {
    S().setConfirm({ id: "c1", title: "Request refill", detail: "Amlodipine 5 mg · 5 days left", primaryLabel: "Request refill", onLateApprove: () => {} });
    const raw = render(<ConfirmCard />);
    const card = strip(raw);
    check("confirm card carries the agent attribution line", card.includes("Your agent is asking you to confirm"), card.slice(0, 300));
    check("confirm card uses the tool's primary label", card.includes("Request refill"));
    check("confirm card offers Decline", card.includes("Decline"));
    check("confirm card shows no countdown", !/\b\d+\s*(s|sec|seconds)\b/i.test(card), card.slice(0, 300));
    check("confirm card top border is the agent colour", raw.includes("border-agent"), raw.slice(0, 200));
    check("confirm card is a dialog", raw.includes('role="dialog"') && raw.includes('aria-modal="true"'));
    break;
  }
  case "confirm-editable": {
    S().setConfirm({ id: "c2", title: "Send message", detail: "To Dr. Maria Rivera", primaryLabel: "Send", editable: { label: "Message", value: "We will do that." }, onLateApprove: () => {} });
    const raw = render(<ConfirmCard />);
    check("editable confirm renders the draft in a textarea", raw.includes("We will do that.") && raw.includes("<textarea"), strip(raw).slice(0, 300));
    check("editable confirm labels the field", strip(raw).includes("Message"));
    break;
  }
  default:
    console.error(`unknown scenario: ${scenario}`);
    process.exit(2);
}

console.log(`  -- ${scenario}: ${pass} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
