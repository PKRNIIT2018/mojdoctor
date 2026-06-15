import { inngest } from "./client";

export { inngest };

export { generateSlots } from "./functions/slot-generation";
export { autoExpireBookings } from "./functions/auto-expire";
export { cleanupPastSlots } from "./functions/slot-cleanup";
export { dailyAgenda } from "./functions/daily-agenda";
export { feedbackPrompt } from "./functions/feedback-prompt";
export { capturePayments } from "./functions/payment-capture";
export { expirePatientReschedules } from "./functions/patient-reschedule-expiry";
export { patientReminder } from "./functions/reminder";
export { detectNoShows } from "./functions/no-show";
export { calendarReconciliation } from "./functions/calendar-reconciliation";
export { googleTokenCheck } from "./functions/google-token-check";

// All functions are auto-registered through import side effects.
// Inngest discovers them via the serve() endpoint or CLI.
