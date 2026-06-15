export type AppointmentState =
  | "PENDING_REVIEW"
  | "AWAITING_CARD"
  | "AWAITING_PATIENT_RESCHEDULE"
  | "AWAITING_DOCTOR_REAPPROVAL"
  | "CONFIRMED"
  | "CAPTURED"
  | "COMPLETED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED_BY_PATIENT"
  | "CANCELLED_BY_DOCTOR"
  | "NO_SHOW"
  | "PAYMENT_FAILED";

const transitions: { from: AppointmentState[]; to: AppointmentState }[] = [
  { from: ["PENDING_REVIEW"], to: "EXPIRED" },
  { from: ["AWAITING_CARD"], to: "EXPIRED" },
  { from: ["CONFIRMED"], to: "CAPTURED" },
  { from: ["CONFIRMED"], to: "PAYMENT_FAILED" },
  { from: ["CONFIRMED", "CAPTURED"], to: "NO_SHOW" },
  { from: ["AWAITING_PATIENT_RESCHEDULE"], to: "CANCELLED_BY_PATIENT" },
];

export function canTransition(from: string, to: AppointmentState): boolean {
  return transitions.some((t) => t.from.includes(from as AppointmentState) && t.to === to);
}
