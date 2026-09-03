/**
 * `auth` scope — the only tool that exists before the user is signed in.
 *
 * Deliberately has no acting-for prefix: there is no patient context yet, and
 * claiming one before sign-in would be a lie to the agent.
 */
import { useStore } from "../../store";
import type { ToolDefinition } from "../registry";
import { text } from "../helpers";

export function getLoginStatusTool(): ToolDefinition {
  return {
    name: "get_login_status",
    description:
      "Reports whether a user is signed in to the patient portal. Agents cannot sign in " +
      "on the user's behalf — if not signed in, tell the user to sign in manually in the " +
      "browser tab and then call get_patient_context. No other tools are available until " +
      "they do.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      const s = useStore.getState();

      s.pushActivity({
        tool: "get_login_status",
        text: s.loggedIn ? "Checked that you are signed in" : "Checked whether you are signed in",
        kind: "system",
      });

      if (!s.loggedIn) {
        return text({
          logged_in: false,
          hint:
            "Ask the user to sign in on the CarePortal tab (there is a one-click demo sign-in " +
            "button on the login page). Once they have, call get_patient_context.",
        });
      }

      return text({
        logged_in: true,
        hint: "Call get_patient_context first to see who the user is acting for.",
      });
    },
  };
}
