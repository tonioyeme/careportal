/**
 * `route` scope — only registered while an appointment detail page is open.
 *
 * The appointment id is captured in the closure rather than taken as an input:
 * the tool moves the appointment the human is currently looking at, which is
 * what makes the scope boundary visible in the demo.
 */
import { ds, selectors, useStore } from "../../store";
import type { ToolDefinition } from "../registry";
import { actingPrefix, follow, text } from "../helpers";
import { showConfirm, statusFromResult } from "../../confirm/confirm";

/** "Tue, Sep 8 at 10:30 AM" — readable in a confirmation card. */
function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function rescheduleAppointmentTool(appointmentId: string): ToolDefinition {
  return {
    name: "reschedule_appointment",
    annotations: { readOnlyHint: false, destructiveHint: false },
    description:
      `${actingPrefix()} Moves the appointment currently open on screen to one of its ` +
      `available slots. Opens a confirmation card showing the old and the new time; nothing ` +
      `moves until the user approves. This tool only exists while an appointment detail page ` +
      `is open — if it disappears, the user navigated away. Returns status: "rescheduled" | ` +
      `"declined_by_user" | "pending_user_confirmation" (the user has not decided within 60 ` +
      `seconds; the card stays open) | "busy" (another confirmation is already open) | ` +
      `"invalid_slot" (the slot is not one of available_slots — the valid list is returned).`,
    inputSchema: {
      type: "object",
      properties: {
        slot: {
          type: "string",
          description:
            "ISO datetime. Must be exactly one of the appointment's available_slots, as " +
            "returned by get_upcoming_appointments.",
        },
      },
      required: ["slot"],
    },
    execute: async (input: { slot: string }) => {
      const pid = useStore.getState().currentPatient;
      const appt = ds.getAppointments(pid).find((a) => a.id === appointmentId);

      if (!appt)
        return text({ status: "error", reason: "the appointment on screen is no longer available" });

      follow(`/appointments/${appt.id}`, { kind: "appointment", id: appt.id }, {
        tool: "reschedule_appointment",
        text: `Looking at moving the ${appt.type.toLowerCase()}`,
        kind: "confirm",
      });

      const slot = String(input?.slot ?? "");
      if (!appt.availableSlots.includes(slot))
        return text({
          status: "invalid_slot",
          appointment_id: appt.id,
          requested_slot: slot,
          available_slots: appt.availableSlots,
        });

      const oldDatetime = appt.datetime;

      const r = await showConfirm({
        title: "Move appointment",
        detail: `${appt.type} with ${selectors.providerName(appt.providerId)}\nFrom ${fmt(oldDatetime)} to ${fmt(slot)}`,
        primaryLabel: "Move appointment",
        onLateApprove: () => ds.reschedule(appt.id, slot),
      });

      useStore.getState().setHighlight(null);
      const failed = statusFromResult(r);
      if (failed)
        return text({
          status: failed,
          appointment_id: appt.id,
          from: oldDatetime,
          to: slot,
        });

      ds.reschedule(appt.id, slot);
      useStore.getState().pushActivity({
        tool: "reschedule_appointment",
        text: `Appointment moved to ${fmt(slot)}`,
        kind: "confirm",
      });

      return text({
        status: "rescheduled",
        appointment_id: appt.id,
        provider: selectors.providerName(appt.providerId),
        from: oldDatetime,
        to: slot,
      });
    },
  };
}
