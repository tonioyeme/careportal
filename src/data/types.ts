// ---------------------------------------------------------------------------
// Domain types. FROZEN. Any change here must be announced to every stream.
// ---------------------------------------------------------------------------

export type PatientId = "linda" | "margaret";
export type ProxyPermission = "view" | "schedule" | "refill" | "message";
export type Specialty = "cardiology" | "endocrinology" | "primary_care";

export interface Patient {
  id: PatientId;
  name: string;
  dob: string; // YYYY-MM-DD
  relationshipToUser: "self" | "proxy";
  proxyPermissions: ProxyPermission[];
  insuranceLine: string; // one line for the overview, e.g. "Medicare + AARP Supplemental"
}

export interface Provider {
  id: string;
  name: string;
  specialty: Specialty;
  inNetwork: boolean;
  location: string;
}

export interface Appointment {
  id: string;
  patientId: PatientId;
  providerId: string;
  datetime: string; // ISO
  type: string;
  status: "scheduled" | "completed";
  availableSlots: string[]; // ISO; only meaningful while scheduled
}

export interface Medication {
  id: string;
  patientId: PatientId;
  name: string;
  dose: string;
  instructions: string;
  daysRemaining: number;
  refillable: boolean; // false => needs prescriber approval
  prescriberId: string;
  refillStatus: "none" | "requested";
}

export interface LabResult {
  id: string;
  patientId: PatientId;
  name: string;
  collectedAt: string; // ISO
  status: "pending" | "final";
  flagged: boolean;
  summary: string; // plain language, for both the page and the agent
  orderedById: string;
}

export interface Message {
  id: string;
  from: "provider" | "patient";
  body: string;
  at: string; // ISO
  read: boolean;
}

export interface MessageThread {
  id: string;
  patientId: PatientId;
  providerId: string;
  subject: string;
  relatedResultId?: string;
  messages: Message[];
}

export interface PendingDocument {
  id: string;
  patientId: PatientId;
  title: string;
  excerpt: string; // shown in the sign modal
  requiresSignatureBy: "patient" | "proxy";
  dueBy: string; // ISO date
  signed: boolean;
  signedAt?: string;
}

// ---------------------------------------------------------------------------
// UI-level shared types
// ---------------------------------------------------------------------------

export type HighlightKind =
  | "appointment"
  | "medication"
  | "result"
  | "thread"
  | "document";

export interface Highlight {
  kind: HighlightKind;
  id: string;
}

/** One line in the right-hand "Agent activity" rail. Written in plain English. */
export interface ActivityEntry {
  id: string;
  at: string; // ISO
  tool: string; // tool name, shown small
  text: string; // e.g. "Checked Margaret's medications — amlodipine is low"
  kind: "read" | "confirm" | "handoff" | "system";
}

export type WebMCPStatus = "native" | "unavailable";
