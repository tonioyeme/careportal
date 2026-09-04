import { create } from "zustand";
import * as seed from "./data/seed";
import type {
  ActivityEntry,
  Appointment,
  Claim,
  Insurance,
  Highlight,
  LabResult,
  Medication,
  MessageThread,
  Patient,
  PatientId,
  PendingDocument,
  Provider,
  WebMCPStatus,
} from "./data/types";
import type { DataSource } from "./data/DataSource";

// ---------------------------------------------------------------------------
// Confirmation card request (owned by Stream C, consumed by Stream B)
// ---------------------------------------------------------------------------
export interface ConfirmRequest {
  id: string;
  title: string; // "Request refill"
  detail: string; // one or two lines of specifics
  primaryLabel: string; // "Request refill", "Send", "Move appointment"
  editable?: { label: string; value: string }; // message body
  /** Called if the user approves AFTER the tool already timed out. Must be idempotent. */
  onLateApprove: (editedValue?: string) => void;
}

export interface AppState {
  // session
  loggedIn: boolean;
  currentPatient: PatientId;

  // data (mutable copies of seed)
  patients: Patient[];
  providers: Provider[];
  appointments: Appointment[];
  medications: Medication[];
  results: LabResult[];
  threads: MessageThread[];
  documents: PendingDocument[];
  insurance: Insurance[];
  claims: Claim[];

  // agent-visible UI state
  highlight: Highlight | null;
  confirm: ConfirmRequest | null;
  activity: ActivityEntry[];
  navRequest: { path: string; nonce: number } | null;
  webmcp: { status: WebMCPStatus; toolCount: number };

  // actions — session
  login(): void;
  logout(): void;
  switchPatient(id: PatientId): void;

  // actions — agent-visible UI
  setHighlight(h: Highlight | null): void;
  setConfirm(c: ConfirmRequest | null): void;
  pushActivity(e: Omit<ActivityEntry, "id" | "at">): void;
  requestNavigate(path: string): void;
  setWebMCP(s: Partial<AppState["webmcp"]>): void;

  // actions — data writes (mirror DataSource)
  requestRefill(medicationId: string): void;
  sendMessage(threadId: string, body: string): void;
  reschedule(appointmentId: string, slot: string): void;
  markThreadRead(threadId: string): void;
  signDocument(documentId: string, signerName: string): void;
}

let nonce = 0;
const uid = () => Math.random().toString(36).slice(2, 10);

export const useStore = create<AppState>((set, get) => ({
  loggedIn: false,
  currentPatient: "linda",

  patients: structuredClone(seed.patients),
  providers: structuredClone(seed.providers),
  appointments: structuredClone(seed.appointments),
  medications: structuredClone(seed.medications),
  results: structuredClone(seed.results),
  threads: structuredClone(seed.threads),
  documents: structuredClone(seed.documents),
  insurance: structuredClone(seed.insurance),
  claims: structuredClone(seed.claims),

  highlight: null,
  confirm: null,
  activity: [],
  navRequest: null,
  webmcp: { status: "unavailable", toolCount: 0 },

  login: () => set({ loggedIn: true, currentPatient: "linda", activity: [] }),
  logout: () => set({ loggedIn: false, highlight: null, confirm: null, activity: [] }),
  switchPatient: (id) => set({ currentPatient: id, highlight: null }),

  setHighlight: (highlight) => set({ highlight }),
  setConfirm: (confirm) => set({ confirm }),
  pushActivity: (e) =>
    set((s) => ({ activity: [...s.activity, { ...e, id: uid(), at: new Date().toISOString() }] })),
  requestNavigate: (path) => set({ navRequest: { path, nonce: ++nonce } }),
  setWebMCP: (partial) => set((s) => ({ webmcp: { ...s.webmcp, ...partial } })),

  requestRefill: (medicationId) =>
    set((s) => ({
      medications: s.medications.map((m) =>
        m.id === medicationId ? { ...m, refillStatus: "requested" } : m,
      ),
    })),
  sendMessage: (threadId, body) =>
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: [
                ...t.messages.map((m) => ({ ...m, read: true })),
                { id: uid(), from: "patient", body, at: new Date().toISOString(), read: true },
              ],
            }
          : t,
      ),
    })),
  reschedule: (appointmentId, slot) =>
    set((s) => ({
      appointments: s.appointments.map((a) =>
        a.id === appointmentId
          ? { ...a, datetime: slot, availableSlots: a.availableSlots.filter((x) => x !== slot) }
          : a,
      ),
    })),
  markThreadRead: (threadId) =>
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId ? { ...t, messages: t.messages.map((m) => ({ ...m, read: true })) } : t,
      ),
    })),
  signDocument: (documentId, signerName) =>
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === documentId
          ? { ...d, signed: true, signedAt: new Date().toISOString() + " by " + signerName }
          : d,
      ),
    })),
}));

// ---------------------------------------------------------------------------
// DataSource view over the store. Tools and pages read through this so the
// swap to FhirDataSource is a one-line change.
// ---------------------------------------------------------------------------
export const ds: DataSource = {
  getPatient: (id) => useStore.getState().patients.find((p) => p.id === id)!,
  getProviders: () => useStore.getState().providers,
  getAppointments: (id) => useStore.getState().appointments.filter((a) => a.patientId === id),
  getMedications: (id) => useStore.getState().medications.filter((m) => m.patientId === id),
  getResults: (id) => useStore.getState().results.filter((r) => r.patientId === id),
  getThreads: (id) => useStore.getState().threads.filter((t) => t.patientId === id),
  getPendingDocuments: (id) => useStore.getState().documents.filter((d) => d.patientId === id),
  getInsurance: (id) => useStore.getState().insurance.find((i) => i.patientId === id)!,
  getClaims: (id) => useStore.getState().claims.filter((c) => c.patientId === id),
  requestRefill: (m) => useStore.getState().requestRefill(m),
  sendMessage: (t, b) => useStore.getState().sendMessage(t, b),
  reschedule: (a, s) => useStore.getState().reschedule(a, s),
  markThreadRead: (t) => useStore.getState().markThreadRead(t),
  signDocument: (d, n) => useStore.getState().signDocument(d, n),
};

// Convenience selectors used by both pages and tools
export const selectors = {
  actingFor: () => {
    const s = useStore.getState();
    const p = s.patients.find((x) => x.id === s.currentPatient)!;
    return { id: p.id, name: p.name, relationship: p.relationshipToUser };
  },
  providerName: (id: string) =>
    useStore.getState().providers.find((p) => p.id === id)?.name ?? "Unknown provider",
};
