/**
 * Two fully-written tools. Every other tool in this folder follows these
 * shapes exactly. Do not invent a different pattern.
 */
import { ds, selectors, useStore } from "../../store";
import { registerTool, type ToolDefinition } from "../registry";
import { actingPrefix, daysLabel, follow, text } from "../helpers";
import { showConfirm, statusFromResult } from "../../confirm/confirm";

// ---------------------------------------------------------------------------
// READ-ONLY exemplar
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
            ? `Checked ${selectors.actingFor().name.split(" ")[0]}'s medications — ${low.map((m) => m.name.toLowerCase()).join(", ")} running low`
            : `Checked ${selectors.actingFor().name.split(" ")[0]}'s medications — nothing running low`,
        },
      );

      return text({
        medications: meds.map((m) => ({
          medication_id: m.id,
          name: m.name,
          dose: m.dose,
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
// CONFIRM-TIER exemplar
// ---------------------------------------------------------------------------
export function requestRefillTool(): ToolDefinition {
  return {
    name: "request_refill",
    description:
      `${actingPrefix()} Requests a refill for one medication. Opens a confirmation card ` +
      `the user must approve; nothing is submitted until they do. Returns status: ` +
      `"submitted" | "declined_by_user" | "requires_provider_approval" (this medication cannot ` +
      `be refilled directly — offer to message the prescriber instead) | ` +
      `"pending_user_confirmation" (the user has not decided within 60 seconds; the card stays ` +
      `open — ask them to respond, then call get_medications to see the outcome) | ` +
      `"busy" (another confirmation is already open) | "already_requested".`,
    inputSchema: {
      type: "object",
      properties: {
        medication_id: { type: "string", description: "From get_medications." },
      },
      required: ["medication_id"],
    },
    execute: async (input: { medication_id: string }) => {
      const pid = useStore.getState().currentPatient;
      const med = ds.getMedications(pid).find((m) => m.id === input.medication_id);

      if (!med) return text({ status: "error", reason: "unknown medication_id" });

      follow("/medications", { kind: "medication", id: med.id }, {
        tool: "request_refill",
        text: `Preparing a refill request for ${med.name.toLowerCase()}`,
        kind: "confirm",
      });

      if (med.refillStatus === "requested") return text({ status: "already_requested", medication: med.name });
      if (!med.refillable)
        return text({
          status: "requires_provider_approval",
          medication: med.name,
          prescriber: selectors.providerName(med.prescriberId),
          prescriber_id: med.prescriberId,
        });

      const r = await showConfirm({
        title: "Request refill",
        detail: `${med.name} ${med.dose} · ${daysLabel(med.daysRemaining)} left · prescribed by ${selectors.providerName(med.prescriberId)}`,
        primaryLabel: "Request refill",
        onLateApprove: () => ds.requestRefill(med.id),
      });

      useStore.getState().setHighlight(null);
      const failed = statusFromResult(r);
      if (failed) return text({ status: failed, medication: med.name });

      ds.requestRefill(med.id);
      useStore.getState().pushActivity({ tool: "request_refill", text: `Refill requested for ${med.name.toLowerCase()}`, kind: "confirm" });
      return text({ status: "submitted", medication: med.name });
    },
  };
}

// ---------------------------------------------------------------------------
// How a scope gets populated (Stream B owns register.ts; this shows the call)
// ---------------------------------------------------------------------------
export function exampleRegisterPatientScope() {
  registerTool("patient", getMedicationsTool());
  registerTool("patient", requestRefillTool());
}
