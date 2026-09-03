/**
 * Headless integration check. Drives the REAL tools through a fake
 * document.modelContext and walks the demo script from DESIGN_v2.md §3
 * plus the checklist in PARALLEL_PLAN.md §5.
 *
 * Run: npm run verify
 */
import type { ToolDefinition } from "../src/webmcp/registry";

// --- fake WebMCP host, installed before any src import runs -----------------
const registered = new Map<string, { def: ToolDefinition; signal?: AbortSignal }>();
(globalThis as any).document = {
  modelContext: {
    registerTool(def: ToolDefinition, opts?: { signal?: AbortSignal }) {
      if (registered.has(def.name)) throw new Error(`duplicate tool: ${def.name}`);
      registered.set(def.name, { def, signal: opts?.signal });
      opts?.signal?.addEventListener("abort", () => registered.delete(def.name));
    },
  },
};

const { useStore, ds } = await import("../src/store");
const { bootstrapWebMCP, registerRouteScope, closeRouteScope } = await import("../src/webmcp/register");
const { resolveConfirm } = await import("../src/confirm/confirm");

// --- tiny assertion harness -------------------------------------------------
let pass = 0;
const failures: string[] = [];
function check(label: string, ok: boolean, detail = "") {
  if (ok) { pass++; console.log(`  ok   ${label}`); }
  else { failures.push(label); console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`); }
}
const names = () => [...registered.keys()].sort();
const call = async (name: string, input: any = {}) => {
  const entry = registered.get(name);
  if (!entry) throw new Error(`tool not registered: ${name}`);
  return JSON.parse((await entry.def.execute(input)).content[0].text);
};
/** Call a confirm-tier tool and answer its card once it appears. */
async function callAndAnswer(name: string, input: any, answer: { approved: true; editedValue?: string } | { approved: false }) {
  const p = call(name, input);
  await new Promise((r) => setTimeout(r, 0));
  if (useStore.getState().confirm) resolveConfirm(answer);
  return p;
}
const S = () => useStore.getState();

console.log("\n== scopes ==");
bootstrapWebMCP();
check("signed out: only get_login_status", names().join() === "get_login_status", names().join());
const loginStatus = await call("get_login_status");
check("get_login_status reports logged_in false", loginStatus.logged_in === false);

S().login();
await new Promise((r) => setTimeout(r, 0));
check("after login: 8 patient tools", registered.size === 8, `got ${registered.size}: ${names().join()}`);
check("auth tool unregistered", !registered.has("get_login_status"));
check(
  "descriptions injected with Linda (self)",
  registered.get("get_medications")!.def.description.startsWith("[Acting for Linda Lee (self)]"),
);

S().switchPatient("margaret");
await new Promise((r) => setTimeout(r, 0));
check("after switch: still 8 tools", registered.size === 8, `got ${registered.size}`);
check(
  "descriptions re-injected with Margaret (proxy)",
  registered.get("get_medications")!.def.description.startsWith("[Acting for Margaret Lee via proxy access]"),
);
check("switch navigates to overview", S().navRequest?.path === "/");

console.log("\n== demo script ==");
const ctx = await call("get_patient_context");
check("context acting_for margaret", ctx.acting_for.id === "margaret" && ctx.acting_for.relationship === "proxy");
check(
  "open item counts (1 unread, 1 low, 1 doc, 1 within 7d)",
  JSON.stringify(ctx.open_items ?? ctx).includes("1"),
  JSON.stringify(ctx.open_items),
);
console.log("       open_items =", JSON.stringify(ctx.open_items));

const appts = await call("get_upcoming_appointments", {});
check("appointments navigates to /appointments", S().navRequest?.path === "/appointments");
check("highlights appt_chen_0908", S().highlight?.kind === "appointment" && S().highlight?.id === "appt_chen_0908", JSON.stringify(S().highlight));

const meds = await call("get_medications", { only_low: true });
check("medications navigates to /medications", S().navRequest?.path === "/medications");
check("only_low returns amlodipine alone", meds.medications.length === 1 && meds.medications[0].medication_id === "med_amlodipine", JSON.stringify(meds.medications.map((m: any) => m.medication_id)));
check("highlights amlodipine", S().highlight?.id === "med_amlodipine");

const insulin = await call("request_refill", { medication_id: "med_insulin" });
check("insulin -> requires_provider_approval", insulin.status === "requires_provider_approval", insulin.status);
check("insulin opened no card", S().confirm === null);

const declined = await callAndAnswer("request_refill", { medication_id: "med_amlodipine" }, { approved: false });
check("declining returns declined_by_user", declined.status === "declined_by_user", declined.status);
check("decline did not mutate", ds.getMedications("margaret").find((m) => m.id === "med_amlodipine")!.refillStatus === "none");

const refill = await callAndAnswer("request_refill", { medication_id: "med_amlodipine" }, { approved: true });
check("approving returns submitted", refill.status === "submitted", refill.status);
check("store now says requested", ds.getMedications("margaret").find((m) => m.id === "med_amlodipine")!.refillStatus === "requested");

const again = await call("request_refill", { medication_id: "med_amlodipine" });
check("second request -> already_requested", again.status === "already_requested", again.status);

const results = await call("get_recent_results", {});
check("results navigates to /results", S().navRequest?.path === "/results");
check("CMP first and flagged", results.results[0].flagged === true, JSON.stringify(results.results[0]));

const unread = await call("get_unread_messages");
check("returns thr_rivera_cmp", JSON.stringify(unread).includes("thr_rivera_cmp"));
check("get_unread_messages does NOT mark read", ds.getThreads("margaret")[0].messages.some((m) => !m.read));
check("highlights the thread", S().highlight?.kind === "thread");

const sent = await callAndAnswer(
  "send_message_to_provider",
  { thread_id: "thr_rivera_cmp", body: "We will make sure she drinks more water." },
  { approved: true, editedValue: "We'll make sure she drinks plenty of water, and we'll recheck in two weeks." },
);
check("send returns sent", sent.status === "sent", sent.status);
check("edited text is what was sent", String(sent.sent_text ?? "").includes("recheck in two weeks"), JSON.stringify(sent));
const thr = ds.getThreads("margaret").find((t) => t.id === "thr_rivera_cmp")!;
check("patient reply appended", thr.messages.at(-1)!.from === "patient");
check("thread now fully read", thr.messages.every((m) => m.read));

const todo = await call("what_requires_me");
check("todo navigates to /todo", S().navRequest?.path === "/todo");
check("one item awaiting signature", todo.items.length === 1, JSON.stringify(todo.items));
check("item explains why a human is needed", /signature/i.test(todo.items[0].why_human ?? ""), JSON.stringify(todo.items[0]));
check("no sign tool is exposed", !names().some((n) => /sign/i.test(n)), names().join());
check("handoff logged in ochre tier", S().activity.at(-1)!.kind === "handoff", S().activity.at(-1)!.kind);

S().signDocument("doc_stress_consent", "Linda Lee");
const todoAfter = await call("what_requires_me");
check("after signing, nothing requires the user", todoAfter.items.length === 0, JSON.stringify(todoAfter.items));

console.log("\n== protocol edge cases ==");
const first = call("request_refill", { medication_id: "med_metformin" });
await new Promise((r) => setTimeout(r, 0));
const second = await call("request_refill", { medication_id: "med_atorvastatin" });
check("second concurrent confirm -> busy", second.status === "busy", second.status);
resolveConfirm({ approved: true });
check("first still resolves submitted", (await first).status === "submitted");

// timeout path: never answer, let the 60s fire, then approve late
console.log("  (waiting out the 60s confirmation timeout…)");
const slow = call("send_message_to_provider", { thread_id: "thr_rivera_cmp", body: "Thanks, understood." });
await new Promise((r) => setTimeout(r, 61_000));
const slowRes = await slow;
check("timeout -> pending_user_confirmation", slowRes.status === "pending_user_confirmation", slowRes.status);
check("card stays open after timeout", S().confirm !== null);
const before = ds.getThreads("margaret").find((t) => t.id === "thr_rivera_cmp")!.messages.length;
resolveConfirm({ approved: true, editedValue: "Thanks, understood." });
const after = ds.getThreads("margaret").find((t) => t.id === "thr_rivera_cmp")!.messages.length;
check("late approval still sends via onLateApprove", after === before + 1, `${before} -> ${after}`);
check("card cleared after late approval", S().confirm === null);

console.log("\n== route scope ==");
registerRouteScope("appt_chen_0908");
check("route scope adds reschedule_appointment", registered.has("reschedule_appointment"));
const bad = await call("reschedule_appointment", { slot: "2026-12-25T09:00:00-04:00" });
check("unknown slot -> invalid_slot", bad.status === "invalid_slot", bad.status);
const moved = await callAndAnswer("reschedule_appointment", { slot: "2026-09-10T09:00:00-04:00" }, { approved: true });
check("valid slot -> rescheduled", moved.status === "rescheduled", moved.status);
check("appointment datetime moved", ds.getAppointments("margaret").find((a) => a.id === "appt_chen_0908")!.datetime === "2026-09-10T09:00:00-04:00");
closeRouteScope();
check("leaving the route unregisters it", !registered.has("reschedule_appointment"));

console.log("\n== logout ==");
S().logout();
await new Promise((r) => setTimeout(r, 0));
check("logout returns to auth scope only", names().join() === "get_login_status", names().join());

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
