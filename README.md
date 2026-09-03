# CarePortal

A patient portal that lets an AI agent do the parts a caregiver shouldn't have to,
and refuses to do the parts only a human may.

CarePortal is a WebMCP demo. It is a working (seeded, no backend) patient portal
for **Linda**, 52, who manages her mother **Margaret**'s care through proxy access:
three specialists, six medications, lab results, provider messages, and a consent
form waiting for a signature. The portal registers ten tools on
`document.modelContext`. An agent already signed in as Linda can read across all
five modules, and can take exactly two write actions, each behind a confirmation
card rendered by the portal itself. It cannot sign anything.

The point is not that an agent can read a portal. The point is that the portal
decides what the agent may do, in the page, in the user's own session.

---

## Why WebMCP and not an API

Hospitals will not issue API keys to your agent. There is no procurement path for
"a stranger's chatbot gets a credential to our EHR."

There is also no write path. Patient-access FHIR, mandated in the US by the 21st
Century Cures Act, exposes reads. `Appointment`, `MedicationRequest`,
`Observation` are all readable with the patient's authorization. Nothing in the
patient-access surface lets software *act as the patient*: request a refill, reply
to a nurse, move an appointment. Those live only in the portal.

WebMCP fills exactly that gap. The user is already signed in. The session already
carries their identity and their proxy rights. The portal declares which of its own
capabilities agents may reach, and renders consent for the risky ones inline, where
the action actually happens. No new authentication surface, no new API, no new
audit story.

---

## Run it

```bash
npm install
npm run dev
```

Then open the printed URL and press **Sign in as Linda (demo)**. There are no
credentials; the form is prefilled and the button is the whole login.

Build: `npm run build` — output in `dist/`. Any static host works.

### Tests

```bash
npm test
```

Two suites, neither needing a browser. The first renders every page and both
modals for both patients and asserts the copy the design depends on. The second
installs a fake `document.modelContext`, boots the real scope lifecycle, and walks
the entire demo script plus the edge cases: declining, `requires_provider_approval`
on a non-refillable drug, a second confirmation returning `busy`, and a real
60-second timeout followed by a late approval. It takes about 70 seconds because
that last one is not mocked.

### Making the tools visible to an agent

WebMCP is behind a flag in Chrome. Enable it at:

```
chrome://flags/#enable-webmcp-testing
```

Restart Chrome, open CarePortal, and the badge in the bottom-right rail should read
`WebMCP native · 8 tools`. To call the tools, use an agent that speaks WebMCP —
the Model Context Tool Inspector extension works for driving them by hand.

**Without the flag the portal still works.** The badge reads `WebMCP unavailable`
and tells you how to turn it on. Tool registration short-circuits; nothing throws.
No polyfill is bundled, deliberately: an unverified shim is a worse failure mode
than an honest status line.

---

## The demo

Linda signs in, switches to Margaret, and says one sentence:

> "My mom has a cardiology follow-up next week, her blood pressure medication is
> almost out, and I think her labs came back — can you check?"

| # | Tool | What the page does | What Linda does |
|---|---|---|---|
| 1 | `get_patient_context` | Overview | — |
| 2 | `get_upcoming_appointments` | Navigates to appointments, highlights Dr. Chen next Tuesday | — |
| 3 | `get_medications({only_low: true})` | Navigates to medications, highlights amlodipine, 5 days left | — |
| 4 | `request_refill` | **Confirmation card** | Approves |
| 5 | `get_recent_results` | Navigates to results, expands the metabolic panel | — |
| 6 | `get_unread_messages` | Expands Dr. Rivera's thread | — |
| 7 | — | — | "Tell her we'll do that, and we'll recheck in two weeks" |
| 8 | `send_message_to_provider` | **Confirmation card, body editable** | Edits a word, sends |
| 9 | `what_requires_me` | Navigates to the to-do page, highlights the consent form | Opens it, signs it |

Four modules, two confirmations, one signature. Roughly forty clicks otherwise.

Two things are load-bearing here and easy to miss:

**The page follows the agent.** Every tool, including the read-only ones, navigates
and highlights before it returns. A read-only tool has no reason to move the page
except that a human is watching it. That is the reason.

**Step 9 hands work back.** `what_requires_me` exists to tell the agent what it
cannot do. Its description says so in plain language: there is no tool to sign a
document. The signature modal is reachable only by a human clicking it.

---

## Tools

Ten tools in three scopes. Each scope is an `AbortController`; closing a scope
unregisters everything in it in one call.

| Tool | Tier | Scope | Returns |
|---|---|---|---|
| `get_login_status` | P0 | `auth` | `logged_in`, plus a hint to sign in manually |
| `get_patient_context` | P0 | `patient` | who we're acting for, proxy permissions, open-item counts |
| `get_upcoming_appointments` | P0 | `patient` | appointments within N days, provider, in-network |
| `get_medications` | P0 | `patient` | days remaining, refillable, prescriber, `low` flag |
| `get_recent_results` | P0 | `patient` | status, flagged, plain-language summary, related thread |
| `get_unread_messages` | P0 | `patient` | thread id, provider, subject, body |
| `request_refill` | P0 | `patient` | `submitted` / `declined_by_user` / `requires_provider_approval` / `pending_user_confirmation` / `busy` / `already_requested` |
| `send_message_to_provider` | P0 | `patient` | `sent` (with final text) / `declined_by_user` / `pending_user_confirmation` / `busy` |
| `what_requires_me` | P0 | `patient` | items only a human can complete, each with `why_human` |
| `reschedule_appointment` | P1 | `route` | `rescheduled` / `invalid_slot` / `declined_by_user` / `pending_user_confirmation` / `busy` |

### Scopes

| Event | Effect |
|---|---|
| App start, signed out | open `auth` — one tool |
| Sign in | close `auth`, open `patient` — eight tools |
| Switch patient | reopen `patient`, re-registering all eight with the new patient injected into every description; close `route` |
| Enter an appointment detail page | open `route` — `reschedule_appointment`, closed over that appointment |
| Leave it | close `route` |
| Sign out | close all, reopen `auth` |

Every `patient`-scope description begins with `[Acting for Margaret Lee via proxy
access]`. That prefix is regenerated at registration time, so switching patients
literally changes what the agent reads. Descriptions are written for the agent:
what the tool does, when to use it, what comes back, and when not to use it.

### Not exposed, on purpose

Signing a consent form, opening a full lab report, and changing proxy permissions
have no tools. `what_requires_me` names them and explains why. A capability tier
that is deliberately empty is a design statement, and it is the one an EHR's
security review will care about most.

### The confirmation protocol

Write tools return a promise that resolves when the user decides. Agent harnesses
time out tool calls, so the timeout is part of the protocol rather than a hope:

- User approves → the effect applies, the tool returns its success status.
- User declines → `declined_by_user`.
- 60 seconds pass → the tool returns `pending_user_confirmation` and **the card
  stays open**. A later approval runs the same store mutation through
  `onLateApprove`. The agent is told to ask the user to respond and then re-read.
- A second confirmation while one is open → `busy`.

The card shows no countdown. The timeout is the agent's problem; putting a clock
in front of a caregiver deciding about her mother's medication is not a kindness.

---

## FHIR mapping

What each tool would talk to in a real deployment, and whether patient-access FHIR
would let you do it.

| Tool | FHIR resource | Patient-authorized API |
|---|---|---|
| `get_upcoming_appointments` | `Appointment` | read |
| `get_medications` | `MedicationRequest` | read |
| `get_recent_results` | `Observation` / `DiagnosticReport` | read |
| `get_unread_messages` | `Communication` | read (some systems) |
| `request_refill` | — | **no write endpoint** |
| `send_message_to_provider` | — | **no write endpoint** |
| `reschedule_appointment` | `Appointment/$book` | rarely exposed |
| signing a consent form | — | none, and none wanted |

The read column is the half a FHIR client could already do. The rest is the half
WebMCP makes possible, and it is the half a caregiver actually spends her evening on.

`src/data/DataSource.ts` is the seam. `SeedDataSource` backs the demo;
`FhirDataSource` is a deliberately unimplemented shell whose method comments carry
the resource mapping above. Swapping one for the other is a one-line change in
`src/store.ts`.

---

## How it's built

Vite, React 18, TypeScript, zustand, react-router, Tailwind. No backend; seed data
lives in `src/data/seed.ts` with today fixed at 2026-09-03.

```
src/
  App.tsx                  three-column shell, routes, nav bridge
  store.ts                 zustand state + the DataSource view over it
  data/                    types, seed, DataSource interface, FHIR shell
  webmcp/
    registry.ts            the only file that touches document.modelContext
    register.ts            scope lifecycle
    helpers.ts             text(), follow(), actingPrefix()
    tools/                 the ten tools
  confirm/                 the confirmation protocol and its card
  pages/  components/      the portal itself
scripts/                   the two test suites
```

Two structural notes. Tools run outside React and cannot reach the router, so they
publish a navigation intent onto the store and one effect in `App.tsx` performs it.
And `registry.ts` disposes every scope on Vite HMR, because re-registering a live
tool name throws.

### A note on the typeface

The portal is set in **Atkinson Hyperlegible**, designed by the Braille Institute
for low-vision readers. Linda is 52 and her eyes are getting worse. The people who
spend the most time in patient portals are, on average, the people who can see them
least well. It seemed like the right default.

---

## License

MIT. See `LICENSE`.
