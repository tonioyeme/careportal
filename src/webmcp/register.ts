/**
 * Scope lifecycle (DESIGN_v2.md §7).
 *
 *   app start, signed out   → open("auth")    → get_login_status
 *   sign in                 → close("auth"); open("patient") → 8 tools
 *   switch patient          → open("patient") (aborts the old one) → 8 tools
 *                             re-registered with the new patient in every
 *                             description; close("route"); navigate to "/"
 *   /appointments/:id       → open("route")   → reschedule_appointment
 *   leave that route        → close("route")
 *   sign out                → closeAll(); open("auth")
 *
 * Descriptions are generated at registration time, and `actingPrefix()` reads
 * the store at that moment — which is exactly why a patient switch has to tear
 * the scope down and build it again rather than leaving the tools in place.
 *
 * Everything here is a safe no-op when WebMCP is unavailable: `registerTool`
 * short-circuits, and the scope bookkeeping still refreshes the status badge.
 */
import { useStore } from "../store";
import type { PatientId } from "../data/types";
import { closeAll, closeScope, hasWebMCP, openScope, registerTool } from "./registry";

import { getLoginStatusTool } from "./tools/auth";
import {
  getMedicationsTool,
  getPatientContextTool,
  getRecentResultsTool,
  getUnreadMessagesTool,
  getUpcomingAppointmentsTool,
} from "./tools/readonly";
import { requestRefillTool, sendMessageToProviderTool } from "./tools/confirm";
import { whatRequiresMeTool } from "./tools/requiresMe";
import { getCoverageTool } from "./tools/insurance";
import { rescheduleAppointmentTool } from "./tools/route";

// ---------------------------------------------------------------------------
// Scope builders
// ---------------------------------------------------------------------------

function buildAuthScope() {
  openScope("auth");
  registerTool("auth", getLoginStatusTool());
}

/**
 * The nine patient-scope tools. Called on login and again on every patient
 * switch so each description carries the current `actingPrefix()`.
 */
function buildPatientScope() {
  openScope("patient");
  registerTool("patient", getPatientContextTool());
  registerTool("patient", getUpcomingAppointmentsTool());
  registerTool("patient", getMedicationsTool());
  registerTool("patient", getRecentResultsTool());
  registerTool("patient", getUnreadMessagesTool());
  registerTool("patient", getCoverageTool());
  registerTool("patient", requestRefillTool());
  registerTool("patient", sendMessageToProviderTool());
  registerTool("patient", whatRequiresMeTool());
}

// ---------------------------------------------------------------------------
// Route scope — called by the appointment detail page
// ---------------------------------------------------------------------------

/** Mount `reschedule_appointment` for the appointment currently on screen. */
export function registerRouteScope(appointmentId: string) {
  if (!useStore.getState().loggedIn) return;
  if (!appointmentId) return;
  openScope("route");
  registerTool("route", rescheduleAppointmentTool(appointmentId));
}

/** Unmount it. Safe to call more than once, and after logout. */
export function closeRouteScope() {
  closeScope("route");
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/**
 * Called once from App.tsx as `useEffect(() => bootstrapWebMCP(), [])`.
 * Returns the cleanup function React will call on unmount / HMR.
 */
export function bootstrapWebMCP(): () => void {
  // Make sure the badge reports something even if no scope ever opens.
  useStore.getState().setWebMCP({ status: hasWebMCP ? "native" : "unavailable" });

  // Start from a known state: an earlier bootstrap (StrictMode's double-invoke
  // in dev, or HMR) may have left controllers behind.
  closeAll();

  let prevLoggedIn: boolean = useStore.getState().loggedIn;
  let prevPatient: PatientId = useStore.getState().currentPatient;

  if (prevLoggedIn) buildPatientScope();
  else buildAuthScope();

  // zustand v4 without `subscribeWithSelector`: the listener gets the whole
  // state, so we diff the two fields we care about ourselves. Registering a
  // tool writes the badge back into the store, which re-enters this listener —
  // the prev* values are updated before any scope work so that re-entry is a
  // no-op rather than an infinite loop.
  const unsubscribe = useStore.subscribe((state) => {
    if (state.loggedIn !== prevLoggedIn) {
      const nowLoggedIn = state.loggedIn;
      prevLoggedIn = state.loggedIn;
      prevPatient = state.currentPatient;

      if (nowLoggedIn) {
        closeScope("auth");
        buildPatientScope();
      } else {
        closeAll();
        buildAuthScope();
      }
      return;
    }

    if (state.loggedIn && state.currentPatient !== prevPatient) {
      prevPatient = state.currentPatient;

      // Rebuild every description around the new patient.
      buildPatientScope();
      // Any appointment detail page we were on belongs to the old patient.
      closeScope("route");
      useStore.getState().requestNavigate("/");
    }
  });

  return () => {
    unsubscribe();
    closeAll();
  };
}
