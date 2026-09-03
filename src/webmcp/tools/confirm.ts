/**
 * `patient` scope — the two write tools. Both are gated by an in-page
 * confirmation card; nothing reaches the store until the user approves.
 *
 * Both follow the exemplar shape exactly:
 *   follow() → validate → showConfirm() → statusFromResult() → apply → text()
 * and both pass an `onLateApprove` that performs the same store mutation as the
 * happy path, so an approval that arrives after the 60s timeout still works.
 */
import { ds, selectors, useStore } from "../../store";
import type { ToolDefinition } from "../registry";
import { actingPrefix, daysLabel, follow, text } from "../helpers";
import { showConfirm, statusFromResult, type ConfirmResult } from "../../confirm/confirm";

const MAX_BODY = 800;

/** The edited text the user typed, if they approved. */
function editedFrom(r: ConfirmResult): string | undefined {
  return "approved" in r && r.approved ? r.editedValue : undefined;
}

// ---------------------------------------------------------------------------
// request_refill
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
      const med = ds.getMedications(pid).find((m) => m.id === input?.medication_id);

      if (!med) return text({ status: "error", reason: "unknown medication_id" });

      follow("/medications", { kind: "medication", id: med.id }, {
        tool: "request_refill",
        text: `Preparing a refill request for ${med.name.toLowerCase()}`,
        kind: "confirm",
      });

      if (med.refillStatus === "requested")
        return text({ status: "already_requested", medication: med.name });

      if (!med.refillable)
        return text({
          status: "requires_provider_approval",
          medication: med.name,
          prescriber: selectors.providerName(med.prescriberId),
          prescriber_id: med.prescriberId,
          hint:
            "This prescription cannot be refilled from the portal. Offer to send a message to " +
            "the prescriber with send_message_to_provider instead.",
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
      useStore.getState().pushActivity({
        tool: "request_refill",
        text: `Refill requested for ${med.name.toLowerCase()}`,
        kind: "confirm",
      });
      return text({ status: "submitted", medication: med.name, medication_id: med.id });
    },
  };
}

// ---------------------------------------------------------------------------
// send_message_to_provider
// ---------------------------------------------------------------------------
export function sendMessageToProviderTool(): ToolDefinition {
  return {
    name: "send_message_to_provider",
    description:
      `${actingPrefix()} Drafts a reply in an existing message thread. Opens a confirmation ` +
      `card where the user can edit the text before it is sent — whatever they leave in the ` +
      `box is what gets sent. Returns status: "sent" (with sent_text, the final wording) | ` +
      `"declined_by_user" | "pending_user_confirmation" (the user has not decided within 60 ` +
      `seconds; the card stays open — ask them to respond) | "busy" (another confirmation is ` +
      `already open). Get thread_id from get_unread_messages or get_recent_results. Keep ` +
      `drafts under 80 words, first person, plain language, no medical advice.`,
    inputSchema: {
      type: "object",
      properties: {
        thread_id: {
          type: "string",
          description: "An existing thread, from get_unread_messages or get_recent_results.",
        },
        body: {
          type: "string",
          description: "The drafted reply. The user can edit it before sending.",
          maxLength: MAX_BODY,
        },
      },
      required: ["thread_id", "body"],
    },
    execute: async (input: { thread_id: string; body: string }) => {
      const pid = useStore.getState().currentPatient;
      const thread = ds.getThreads(pid).find((t) => t.id === input?.thread_id);

      if (!thread) return text({ status: "error", reason: "unknown thread_id" });

      const body = String(input?.body ?? "");
      if (!body.trim()) return text({ status: "error", reason: "body is empty" });
      if (body.length > MAX_BODY)
        return text({
          status: "error",
          reason: `body is ${body.length} characters; the maximum is ${MAX_BODY}`,
        });

      const providerName = selectors.providerName(thread.providerId);

      follow("/results", { kind: "thread", id: thread.id }, {
        tool: "send_message_to_provider",
        text: `Drafted a reply to ${providerName}`,
        kind: "confirm",
      });

      const r = await showConfirm({
        title: `Send message to ${providerName}`,
        detail: `Thread: ${thread.subject}`,
        primaryLabel: "Send",
        editable: { label: "Message", value: body },
        onLateApprove: (editedValue) => ds.sendMessage(thread.id, editedValue ?? body),
      });

      useStore.getState().setHighlight(null);
      const failed = statusFromResult(r);
      if (failed)
        return text({ status: failed, thread_id: thread.id, provider: providerName });

      const sentText = editedFrom(r) ?? body;
      ds.sendMessage(thread.id, sentText);
      useStore.getState().pushActivity({
        tool: "send_message_to_provider",
        text: `Message sent to ${providerName}`,
        kind: "confirm",
      });

      return text({
        status: "sent",
        thread_id: thread.id,
        provider: providerName,
        subject: thread.subject,
        sent_text: sentText,
        edited_by_user: sentText !== body,
      });
    },
  };
}
