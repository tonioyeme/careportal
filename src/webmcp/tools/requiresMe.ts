/**
 * `patient` scope — the handoff tool.
 *
 * This is the whole argument of the project in one tool: there are things an
 * agent must not do, and the honest move is to name them and hand them back.
 * There is deliberately no sign_document tool anywhere in this codebase.
 */
import { ds, useStore } from "../../store";
import type { ToolDefinition } from "../registry";
import { actingPrefix, follow, text } from "../helpers";

const WHY_HUMAN = "Requires legal signature by patient or authorized proxy";

export function whatRequiresMeTool(): ToolDefinition {
  return {
    name: "what_requires_me",
    description:
      `${actingPrefix()} Lists the actions only the user can perform: documents awaiting a ` +
      `legal signature, full records that must be opened directly, and account settings. ` +
      `Navigates the page to the to-do list and highlights the first item. Use this when the ` +
      `user asks "is there anything I need to do", or after the other tasks are finished. ` +
      `There is no tool to sign documents — the user must do it themselves, in the portal. ` +
      `Do not offer to sign, and do not claim anything was signed. Returns items shaped ` +
      `{ id, title, why_human, due_by }; an empty list means nothing is waiting on the user.`,
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      const pid = useStore.getState().currentPatient;
      const pending = ds.getPendingDocuments(pid).filter((d) => !d.signed);

      follow(
        "/todo",
        pending[0] ? { kind: "document", id: pending[0].id } : null,
        {
          tool: "what_requires_me",
          text: pending.length
            ? `Handing back to you: ${pending[0].title.toLowerCase()} needs your signature`
            : "Checked your to-do list — nothing needs you right now",
          kind: "handoff",
        },
      );

      return text({
        items: pending.map((d) => ({
          id: d.id,
          title: d.title,
          why_human: WHY_HUMAN,
          due_by: d.dueBy,
        })),
        note:
          pending.length > 0
            ? "There is no tool that can sign these, and no way for you to sign on the user's " +
              "behalf. The page is now showing the to-do list with the item highlighted. Tell " +
              "the user to press \"Review and sign\" on it themselves. Do not say it is signed."
            : "Nothing requires the user right now.",
      });
    },
  };
}
