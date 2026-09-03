/**
 * `patient` scope — the five read-only tools.
 *
 * Every one of them navigates the page and highlights the object it is talking
 * about, so the human watching the screen sees exactly what the agent read.
 * None of them mutates anything: in particular get_unread_messages does NOT
 * mark a thread as read — reading it is the user's act, not the agent's.
 */
import { ds, selectors, useStore } from "../../store";
import type { ToolDefinition } from "../registry";
import { actingPrefix, follow, text } from "../helpers";
import type { Appointment, MessageThread, PatientId } from "../../data/types";

const firstName = () => selectors.actingFor().name.split(" ")[0];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Scheduled appointments in the future, soonest first. */
function upcoming(pid: PatientId): Appointment[] {
  const now = Date.now();
  return ds
    .getAppointments(pid)
    .filter((a) => a.status === "scheduled" && new Date(a.datetime).getTime() >= now)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
}

function unreadThreads(pid: PatientId): MessageThread[] {
  return ds
    .getThreads(pid)
    .filter((t) => t.messages.some((m) => m.from === "provider" && !m.read));
}

// ---------------------------------------------------------------------------
// get_patient_context
// ---------------------------------------------------------------------------
export function getPatientContextTool(): ToolDefinition {
  return {
    name: "get_patient_context",
    description:
      `${actingPrefix()} Returns who the user is acting for, their proxy permissions, and ` +
      `counts of open items (unread messages, low medications, pending documents, ` +
      `appointments in the next 7 days). Call this FIRST, before any other tool. ` +
      `Contains no clinical data — use the other tools for that.`,
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      const pid = useStore.getState().currentPatient;
      const patient = ds.getPatient(pid);

      const unread = unreadThreads(pid);
      const lowMeds = ds.getMedications(pid).filter((m) => m.daysRemaining < 7);
      const pendingDocs = ds.getPendingDocuments(pid).filter((d) => !d.signed);
      const soon = upcoming(pid).filter(
        (a) => new Date(a.datetime).getTime() - Date.now() <= 7 * DAY_MS,
      );

      follow("/", null, {
        tool: "get_patient_context",
        text: `Opened ${firstName()}'s overview`,
      });

      return text({
        patient: {
          id: patient.id,
          name: patient.name,
          dob: patient.dob,
          relationship: patient.relationshipToUser,
          insurance: patient.insuranceLine,
        },
        proxy_permissions: patient.proxyPermissions,
        open_items: {
          unread_messages: unread.length,
          low_medications: lowMeds.length,
          pending_documents: pendingDocs.length,
          appointments_next_7_days: soon.length,
        },
      });
    },
  };
}

// ---------------------------------------------------------------------------
// get_upcoming_appointments
// ---------------------------------------------------------------------------
export function getUpcomingAppointmentsTool(): ToolDefinition {
  return {
    name: "get_upcoming_appointments",
    description:
      `${actingPrefix()} Lists scheduled appointments within the next N days with provider, ` +
      `specialty, datetime, location, and in-network status. Navigates the page to the ` +
      `appointments list and highlights the soonest one.`,
    inputSchema: {
      type: "object",
      properties: {
        within_days: {
          type: "integer",
          description: "How far ahead to look, in days.",
          minimum: 1,
          maximum: 365,
          default: 30,
        },
      },
      required: [],
    },
    execute: async (input: { within_days?: number }) => {
      const pid = useStore.getState().currentPatient;

      const raw = Number(input?.within_days);
      const withinDays = Number.isFinite(raw) ? Math.min(365, Math.max(1, Math.floor(raw))) : 30;

      const all = upcoming(pid);
      const cutoff = Date.now() + withinDays * DAY_MS;
      const appts = all.filter((a) => new Date(a.datetime).getTime() <= cutoff);

      follow(
        "/appointments",
        appts[0] ? { kind: "appointment", id: appts[0].id } : null,
        {
          tool: "get_upcoming_appointments",
          text: appts.length
            ? `Checked ${firstName()}'s appointments — ${appts.length === 1 ? "1 visit" : `${appts.length} visits`} in the next ${withinDays} days`
            : `Checked ${firstName()}'s appointments — nothing in the next ${withinDays} days`,
        },
      );

      return text({
        within_days: withinDays,
        appointments: appts.map((a) => {
          const prov = useStore.getState().providers.find((p) => p.id === a.providerId);
          return {
            appointment_id: a.id,
            datetime: a.datetime,
            type: a.type,
            status: a.status,
            provider: selectors.providerName(a.providerId),
            provider_id: a.providerId,
            specialty: prov?.specialty ?? "unknown",
            location: prov?.location ?? "",
            in_network: prov?.inNetwork ?? false,
            available_slots: a.availableSlots,
          };
        }),
      });
    },
  };
}

// ---------------------------------------------------------------------------
// get_medications  (moved here from exemplars.ts — same implementation)
// ---------------------------------------------------------------------------
export function getMedicationsTool(): ToolDefinition {
  return {
    name: "get_medications",
    description:
      `${actingPrefix()} Lists active medications with days of supply remaining, ` +
      `whether a refill can be requested directly (refillable) or needs prescriber approval, ` +
      `and the prescriber. Medications with days_remaining < 7 are flagged "low". ` +
      `Navigates the page to the medications list. Call this before request_refill.`,
    inputSchema: {
      type: "object",
      properties: {
        only_low: {
          type: "boolean",
          description: "If true, return only medications with fewer than 7 days remaining.",
          default: false,
        },
      },
      required: [],
    },
    execute: async (input: { only_low?: boolean }) => {
      const pid = useStore.getState().currentPatient;
      const all = ds.getMedications(pid);
      const meds = input?.only_low ? all.filter((m) => m.daysRemaining < 7) : all;
      const low = all.filter((m) => m.daysRemaining < 7);

      follow(
        "/medications",
        low[0] ? { kind: "medication", id: low[0].id } : null,
        {
          tool: "get_medications",
          text: low.length
            ? `Checked ${firstName()}'s medications — ${low.map((m) => m.name.toLowerCase()).join(", ")} running low`
            : `Checked ${firstName()}'s medications — nothing running low`,
        },
      );

      return text({
        medications: meds.map((m) => ({
          medication_id: m.id,
          name: m.name,
          dose: m.dose,
          instructions: m.instructions,
          days_remaining: m.daysRemaining,
          low: m.daysRemaining < 7,
          refillable: m.refillable,
          refill_status: m.refillStatus,
          prescriber: selectors.providerName(m.prescriberId),
          prescriber_id: m.prescriberId,
        })),
      });
    },
  };
}

// ---------------------------------------------------------------------------
// get_recent_results
// ---------------------------------------------------------------------------
export function getRecentResultsTool(): ToolDefinition {
  return {
    name: "get_recent_results",
    description:
      `${actingPrefix()} Lists lab results newest first: status (pending/final), whether any ` +
      `value was flagged, a plain-language summary, and the id of any related message thread. ` +
      `Navigates the page to the results list. Does not include the full report — that has to ` +
      `be opened by the user.`,
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "How many results to return, newest first.",
          minimum: 1,
          maximum: 20,
          default: 5,
        },
      },
      required: [],
    },
    execute: async (input: { limit?: number }) => {
      const pid = useStore.getState().currentPatient;

      const raw = Number(input?.limit);
      const limit = Number.isFinite(raw) ? Math.min(20, Math.max(1, Math.floor(raw))) : 5;

      const sorted = ds
        .getResults(pid)
        .slice()
        .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
      const shown = sorted.slice(0, limit);

      const threads = ds.getThreads(pid);
      const threadFor = (resultId: string) =>
        threads.find((t) => t.relatedResultId === resultId)?.id ?? null;

      const flagged = shown.filter((r) => r.flagged);

      follow(
        "/results",
        shown[0] ? { kind: "result", id: shown[0].id } : null,
        {
          tool: "get_recent_results",
          text: flagged.length
            ? `Read ${firstName()}'s lab results — ${flagged.map((r) => r.name.toLowerCase()).join(", ")} flagged`
            : `Read ${firstName()}'s lab results — nothing flagged`,
        },
      );

      return text({
        results: shown.map((r) => ({
          result_id: r.id,
          name: r.name,
          collected_at: r.collectedAt,
          status: r.status,
          flagged: r.flagged,
          summary: r.summary,
          ordered_by: selectors.providerName(r.orderedById),
          related_thread_id: threadFor(r.id),
        })),
      });
    },
  };
}

// ---------------------------------------------------------------------------
// get_unread_messages
// ---------------------------------------------------------------------------
export function getUnreadMessagesTool(): ToolDefinition {
  return {
    name: "get_unread_messages",
    description:
      `${actingPrefix()} Returns unread messages from providers: thread_id, provider, subject, ` +
      `and body. Navigates the page to the results page and expands the thread so the user can ` +
      `read it too. This does not mark anything as read — only the user opening or replying ` +
      `does that. Use before send_message_to_provider.`,
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      const pid = useStore.getState().currentPatient;
      const threads = unreadThreads(pid);

      follow(
        "/results",
        threads[0] ? { kind: "thread", id: threads[0].id } : null,
        {
          tool: "get_unread_messages",
          text: threads.length
            ? `Opened the message from ${selectors.providerName(threads[0].providerId)}`
            : "Checked messages — nothing unread",
        },
      );

      // Deliberately NOT calling ds.markThreadRead: reading is the user's act.
      return text({
        unread_count: threads.length,
        messages: threads.flatMap((t) =>
          t.messages
            .filter((m) => m.from === "provider" && !m.read)
            .map((m) => ({
              thread_id: t.id,
              provider: selectors.providerName(t.providerId),
              provider_id: t.providerId,
              subject: t.subject,
              body: m.body,
              received_at: m.at,
              related_result_id: t.relatedResultId ?? null,
            })),
        ),
      });
    },
  };
}
