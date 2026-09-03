import type {
  Appointment,
  LabResult,
  Medication,
  MessageThread,
  Patient,
  PendingDocument,
  Provider,
} from "./types";

// Today is 2026-09-03 (Thu). All dates below are relative to that.

export const patients: Patient[] = [
  {
    id: "linda",
    name: "Linda Lee",
    dob: "1974-03-18",
    relationshipToUser: "self",
    proxyPermissions: ["view", "schedule", "refill", "message"],
    insuranceLine: "Horizon BCBS PPO",
  },
  {
    id: "margaret",
    name: "Margaret Lee",
    dob: "1948-06-02",
    relationshipToUser: "proxy",
    proxyPermissions: ["view", "schedule", "refill", "message"],
    insuranceLine: "Medicare Part B + AARP Supplemental",
  },
];

export const providers: Provider[] = [
  { id: "prov_chen", name: "Dr. Alice Chen", specialty: "cardiology", inNetwork: true, location: "Hackensack Heart Center, 3rd floor" },
  { id: "prov_patel", name: "Dr. Raj Patel", specialty: "endocrinology", inNetwork: true, location: "Bergen Endocrine Associates" },
  { id: "prov_rivera", name: "Dr. Maria Rivera", specialty: "primary_care", inNetwork: true, location: "Riverside Family Medicine" },
];

export const appointments: Appointment[] = [
  {
    id: "appt_chen_0908",
    patientId: "margaret",
    providerId: "prov_chen",
    datetime: "2026-09-08T10:30:00-04:00", // next Tuesday
    type: "Cardiology follow-up",
    status: "scheduled",
    availableSlots: [
      "2026-09-10T09:00:00-04:00",
      "2026-09-10T14:00:00-04:00",
      "2026-09-14T11:00:00-04:00",
    ],
  },
  {
    id: "appt_patel_0924",
    patientId: "margaret",
    providerId: "prov_patel",
    datetime: "2026-09-24T09:00:00-04:00",
    type: "Diabetes check-in",
    status: "scheduled",
    availableSlots: ["2026-09-25T09:00:00-04:00", "2026-09-29T15:30:00-04:00"],
  },
  {
    id: "appt_linda_annual",
    patientId: "linda",
    providerId: "prov_rivera",
    datetime: "2026-10-15T08:00:00-04:00",
    type: "Annual physical",
    status: "scheduled",
    availableSlots: ["2026-10-16T08:00:00-04:00"],
  },
];

export const medications: Medication[] = [
  { id: "med_amlodipine", patientId: "margaret", name: "Amlodipine", dose: "5 mg", instructions: "Once daily in the morning", daysRemaining: 5, refillable: true, prescriberId: "prov_chen", refillStatus: "none" },
  { id: "med_metformin", patientId: "margaret", name: "Metformin", dose: "500 mg", instructions: "Twice daily with meals", daysRemaining: 23, refillable: true, prescriberId: "prov_patel", refillStatus: "none" },
  { id: "med_atorvastatin", patientId: "margaret", name: "Atorvastatin", dose: "20 mg", instructions: "Once daily at bedtime", daysRemaining: 40, refillable: true, prescriberId: "prov_chen", refillStatus: "none" },
  { id: "med_insulin", patientId: "margaret", name: "Insulin glargine", dose: "18 units", instructions: "Once daily at bedtime", daysRemaining: 12, refillable: false, prescriberId: "prov_patel", refillStatus: "none" },
  { id: "med_aspirin", patientId: "margaret", name: "Aspirin", dose: "81 mg", instructions: "Once daily", daysRemaining: 60, refillable: true, prescriberId: "prov_rivera", refillStatus: "none" },
  { id: "med_vitd", patientId: "margaret", name: "Vitamin D3", dose: "2000 IU", instructions: "Once daily", daysRemaining: 90, refillable: true, prescriberId: "prov_rivera", refillStatus: "none" },
  { id: "med_linda_levo", patientId: "linda", name: "Levothyroxine", dose: "50 mcg", instructions: "Once daily before breakfast", daysRemaining: 45, refillable: true, prescriberId: "prov_rivera", refillStatus: "none" },
  { id: "med_linda_cetirizine", patientId: "linda", name: "Cetirizine", dose: "10 mg", instructions: "Once daily as needed", daysRemaining: 30, refillable: true, prescriberId: "prov_rivera", refillStatus: "none" },
];

export const results: LabResult[] = [
  {
    id: "res_cmp",
    patientId: "margaret",
    name: "Comprehensive metabolic panel",
    collectedAt: "2026-08-31T08:15:00-04:00",
    status: "final",
    flagged: true,
    summary: "Creatinine slightly elevated at 1.3 mg/dL (reference 0.6–1.1). All other values within normal range.",
    orderedById: "prov_rivera",
  },
  {
    id: "res_a1c",
    patientId: "margaret",
    name: "Hemoglobin A1c",
    collectedAt: "2026-08-31T08:15:00-04:00",
    status: "pending",
    flagged: false,
    summary: "Result not yet available.",
    orderedById: "prov_patel",
  },
];

export const threads: MessageThread[] = [
  {
    id: "thr_rivera_cmp",
    patientId: "margaret",
    providerId: "prov_rivera",
    subject: "Your recent lab results",
    relatedResultId: "res_cmp",
    messages: [
      {
        id: "msg_1",
        from: "provider",
        body: "Hi Linda — Margaret's creatinine came back slightly elevated at 1.3. This is often related to hydration. Please make sure she's drinking plenty of water, and we'll recheck in two weeks. Let me know if you notice any swelling in her legs or reduced urination.",
        at: "2026-09-02T16:40:00-04:00",
        read: false,
      },
    ],
  },
];

export const documents: PendingDocument[] = [
  {
    id: "doc_stress_consent",
    patientId: "margaret",
    title: "Consent for cardiac stress test",
    excerpt:
      "I understand that a cardiac stress test involves exercise or medication to increase heart rate while monitoring the heart's electrical activity. I have been informed of the risks, including irregular heartbeat, chest pain, and, rarely, heart attack. I consent to this procedure and authorize Hackensack Heart Center to perform it.",
    requiresSignatureBy: "proxy",
    dueBy: "2026-09-11",
    signed: false,
  },
];
