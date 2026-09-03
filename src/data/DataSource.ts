import type {
  Appointment,
  LabResult,
  Medication,
  MessageThread,
  Patient,
  PatientId,
  PendingDocument,
  Provider,
} from "./types";

/**
 * Everything the UI and the WebMCP tools read or write goes through this.
 * SeedDataSource is the only implementation for the hackathon.
 * FhirDataSource below documents how the same interface maps onto
 * SMART on FHIR patient-access APIs (21st Century Cures Act).
 */
export interface DataSource {
  // reads
  getPatient(id: PatientId): Patient;
  getProviders(): Provider[];
  getAppointments(id: PatientId): Appointment[];
  getMedications(id: PatientId): Medication[];
  getResults(id: PatientId): LabResult[];
  getThreads(id: PatientId): MessageThread[];
  getPendingDocuments(id: PatientId): PendingDocument[];

  // writes — every one of these is behind an in-page confirmation
  // or is human-only (signDocument has NO corresponding WebMCP tool)
  requestRefill(medicationId: string): void;
  sendMessage(threadId: string, body: string): void;
  reschedule(appointmentId: string, slot: string): void;
  markThreadRead(threadId: string): void;
  signDocument(documentId: string, signerName: string): void;
}

/**
 * NOT IMPLEMENTED. Exists to make the production path concrete.
 *
 * Patient-access FHIR (R4) exposes reads; it does not expose "act as the
 * patient" writes. That gap is exactly what the in-portal WebMCP tools cover.
 */
export class FhirDataSource implements DataSource {
  constructor(private baseUrl: string, private token: string) {}
  // GET /Patient/{id}
  getPatient(): Patient { throw new Error("FhirDataSource: not implemented"); }
  // GET /Practitioner?_id=...
  getProviders(): Provider[] { throw new Error("not implemented"); }
  // GET /Appointment?patient={id}&date=ge{today}
  getAppointments(): Appointment[] { throw new Error("not implemented"); }
  // GET /MedicationRequest?patient={id}&status=active
  getMedications(): Medication[] { throw new Error("not implemented"); }
  // GET /Observation?patient={id}&category=laboratory  +  /DiagnosticReport
  getResults(): LabResult[] { throw new Error("not implemented"); }
  // GET /Communication?recipient=Patient/{id}   (offered by some, not all, systems)
  getThreads(): MessageThread[] { throw new Error("not implemented"); }
  // GET /DocumentReference?patient={id}&status=current  (consent forms, where exposed)
  getPendingDocuments(): PendingDocument[] { throw new Error("not implemented"); }

  // No patient-access write endpoint. Portal-only.
  requestRefill(): void { throw new Error("no patient-access FHIR write; portal-only"); }
  // No patient-access write endpoint. Portal-only.
  sendMessage(): void { throw new Error("no patient-access FHIR write; portal-only"); }
  // POST /Appointment/$book — rarely exposed to patient apps. Portal-only in practice.
  reschedule(): void { throw new Error("rarely exposed; portal-only"); }
  markThreadRead(): void { throw new Error("not implemented"); }
  // Legal signature. Never delegated to an agent by design.
  signDocument(): void { throw new Error("human-only"); }
}
