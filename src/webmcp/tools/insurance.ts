/**
 * Coverage and claims. Read-only.
 *
 * Worth noting where this data would come from in production: not the clinical
 * FHIR server, but the payer's own Patient Access API, mandated by the CMS
 * Interoperability and Patient Access rule. Coverage and ExplanationOfBenefit
 * are readable. Appealing a denial is not — that happens in the payer's portal,
 * which is the same gap the confirmation-card tools cover on the clinical side.
 */
import { ds, selectors, useStore } from "../../store";
import type { ToolDefinition } from "../registry";
import { actingPrefix, follow, text } from "../helpers";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export function getCoverageTool(): ToolDefinition {
  return {
    name: "get_coverage",
    annotations: { readOnlyHint: true },
    description:
      `${actingPrefix()} Returns the health plan and recent claims: what was billed, what the ` +
      `plan paid, what the patient still owes, and for anything denied, the stated reason and ` +
      `the appeal deadline. Navigates the page to the insurance summary and highlights the ` +
      `first denied claim. Use this when the user asks about coverage, a bill, what something ` +
      `cost, or why a claim was denied. There is no tool to file an appeal — an appeal is a ` +
      `formal document the user must submit through the plan themselves.`,
    inputSchema: {
      type: "object",
      properties: {
        only_action_needed: {
          type: "boolean",
          description: "If true, return only claims that are denied or still processing.",
          default: false,
        },
      },
      required: [],
    },
    execute: async (input: { only_action_needed?: boolean }) => {
      const pid = useStore.getState().currentPatient;
      const plan = ds.getInsurance(pid);
      const all = ds
        .getClaims(pid)
        .slice()
        .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
      const denied = all.filter((c) => c.status === "denied");
      const claims = input?.only_action_needed
        ? all.filter((c) => c.status !== "paid")
        : all;

      const first = selectors.actingFor().name.split(" ")[0];
      follow(
        "/insurance",
        denied[0] ? { kind: "claim", id: denied[0].id } : null,
        {
          tool: "get_coverage",
          text: denied.length
            ? `Checked ${first}'s coverage — ${denied.length === 1 ? "one claim was denied" : `${denied.length} claims were denied`}`
            : `Checked ${first}'s coverage — nothing denied`,
        },
      );

      return text({
        plan: {
          name: plan.planName,
          supplement: plan.supplementName ?? null,
          member_id: plan.memberId,
          deductible: { annual: plan.deductible.annual, met: plan.deductible.met },
          out_of_pocket_max: { annual: plan.outOfPocketMax.annual, met: plan.outOfPocketMax.met },
        },
        claims: claims.map((c) => ({
          claim_id: c.id,
          service_date: c.serviceDate,
          description: c.description,
          provider: selectors.providerName(c.providerId),
          billed: c.billed,
          plan_paid: c.planPaid,
          patient_owes: c.patientOwes,
          status: c.status,
          denial_reason: c.denialReason ?? null,
          appeal_deadline: c.appealDeadline ?? null,
        })),
        total_owed: money(all.reduce((n, c) => n + c.patientOwes, 0)),
        note: denied.length
          ? "A denied claim can be appealed, but there is no tool for that. Appeals are filed " +
            "through the plan directly. Tell the user the reason and the deadline; do not offer " +
            "to appeal and do not claim an appeal was filed."
          : "Nothing needs the user's attention on the billing side.",
      });
    },
  };
}
