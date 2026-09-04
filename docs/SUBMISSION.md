# Devpost submission copy

**Live URL:** https://careportal.vercel.app
**Demo login note for the form:** "Demo login button on the login page — press *Sign in as Linda (demo)*. No credentials needed."
**Repo:** https://github.com/tonioyeme/careportal · **Video:** _(填入 YouTube 链接)_

---

## 1. Why does this need WebMCP?

Hospitals will never issue an API key to a stranger's agent; there is no procurement
path for it. And even where an API exists, it is the wrong half: patient-access FHIR,
mandated in the US by the Cures Act, exposes reads only. You can read `Appointment`,
`MedicationRequest`, and `Observation` with the patient's authorization, but nothing
in that surface lets software *act as the patient* — request a refill, reply to a
nurse, move a visit. Those capabilities exist only inside the portal, behind the
session. WebMCP reuses that session instead of inventing a second one, and lets the
portal itself decide, per tool, what an agent may reach. Consent renders in the page
where the action lives, not in a separate app the hospital would also have to build.

## 2. What does this make better?

Linda manages her mother Margaret's care: three specialists, six medications, labs,
messages, and a consent form. Doing one week's worth of that today means five
disconnected modules and roughly forty clicks. In CarePortal she says one sentence.
The agent reads the appointment, catches that the blood-pressure medication has five
days left, requests the refill, finds the flagged lab and the nurse's message about
it, drafts a reply, and surfaces the consent form. Linda approves twice and signs
once. The portal navigates and highlights on every single tool call, including the
read-only ones, so she is watching the same screen the agent is working on rather
than trusting a summary after the fact.

## 3. What is newly possible?

Three things. First, reasoning across modules that no portal does: "what about this
week is affected by that lab result" spans results, medications, appointments, and
messages, which are four separate screens with no relationship between them.
Second, consent at the point of action — a confirmation card rendered by the portal,
with the message body editable before it sends, so the human's edit is what actually
goes to the provider. Third, and most important, a deliberately empty tier. Signing
a consent form has no tool. `what_requires_me` exists specifically to tell the agent
what it cannot do and hand the work back, and its description says so in plain
language. An agent platform that can express "not this, ever" is one an EHR security
review can actually approve.

The same shape shows up on the billing side, under a different regulator. Payer
Patient Access APIs let an app read a patient's claims, so the agent can find the
denied echocardiogram and read back why. Nothing in that mandate lets it file the
appeal, which is a formal document with a deadline that a human must submit through
the plan. Read is legislated; acting is not. That gap is not a healthcare quirk. It
is the shape of nearly every regulated workflow on the web, and it is the gap WebMCP
is for.

## 4. How did you build it?

Eleven tools across three scopes — `auth`, `patient`, `route` — each scope an
`AbortController`, so closing one unregisters everything in it atomically. The
patient scope is rebuilt on every patient switch, which regenerates all nine
descriptions with the current patient injected: switching from Linda to Margaret
literally changes what the agent reads. Write tools return a promise resolved by an
in-page confirmation card, with a 60-second timeout treated as a protocol state
rather than an accident: the tool returns `pending_user_confirmation`, the card stays
open, and a later approval applies the same effect through an idempotent late path.
Every tool navigates and highlights before it returns. React 18, TypeScript, zustand,
Tailwind; `registry.ts` is the only file that touches `document.modelContext`, and a
`DataSource` seam documents the FHIR resource behind each tool.

---

## Video narration (target 2:40)

### 0:00–0:20 — the problem

> This is Linda. Every week she spends an evening in her mother's patient portal.
> Margaret is 78, sees three specialists, and takes six medications. The portal has
> everything Linda needs, in five screens that know nothing about each other.

*(On screen: the overview, then click through appointments, medications, results,
to-do. Let the disconnection show.)*

### 0:20–0:35 — the setup

> This portal registers ten tools on `document.modelContext`. No API key. No new
> login. Linda is already signed in, and the portal decides what her agent may
> touch. Watch the right-hand column — everything the agent does shows up there.

*(On screen: the badge reading `WebMCP native · 8 tools`, the empty agent rail.)*

### 0:35–1:50 — the run

> One sentence.

*(Type: "My mom has a cardiology follow-up next week, her blood pressure medication
is almost out, and I think her labs came back — can you check?")*

> It starts with context. Then appointments — and the page follows it. Dr. Chen,
> next Tuesday, in network.

*(Hold half a second on each navigation.)*

> Medications. Amlodipine, five days left. It found the one that matters.
> And now it wants to do something, so it has to ask.

*(Confirmation card. Hold a full second before approving.)*

> Nothing was submitted until Linda approved it. That card is rendered by the
> portal, not the agent.

> The labs are back — creatinine slightly high — and here is why: Dr. Rivera left a
> message about it two days ago that nobody had opened.

*(Thread expands.)*

> Linda answers in her own words. The agent drafts. She edits it before it sends.

*(Edit one word in the card, send.)*

> And then the last step, which is the interesting one.

### 1:50–2:15 — the handoff and the code

> `what_requires_me` doesn't do anything. It reports what the agent *can't* do.
> There is a consent form due next week, and there is no tool to sign it. Its
> description says exactly that, to the agent, in plain language.

*(Signature modal opens — note the different colour — Linda types her name and signs.)*

> Three scopes, each an AbortController. Switch patients and all eight tools
> re-register with the new patient's name in every description. Two tools open a
> confirmation card. Signing has no tool at all, and that is the design.

*(On screen: `registry.ts`, then the `what_requires_me` description.)*

### 2:15–2:40 — the close

> Patient-access FHIR gives you reads. It will never give you "act as the patient" —
> that is the half Linda's evening is actually made of, and it exists only inside
> the portal.
>
> No hospital is going to hand your agent an API key. But it can add two hundred
> lines to its own page, and decide exactly what an agent may do — and what it
> may never do.

---

## Recording checklist

- Portal on the left, agent on the right, both visible the whole time.
- Half a second of stillness after every page navigation; a full second on each
  confirmation card before clicking.
- Start signed out so the empty agent rail and its one line of copy are on screen.
- Switch to Margaret on camera — the acting-for banner changing is the cheapest
  possible proof that the scope was rebuilt.
- Fallback if the agent harness misbehaves: drive the tools by hand from the Model
  Context Tool Inspector extension. The page-follow behaviour is identical and it
  is what the video is actually showing.
