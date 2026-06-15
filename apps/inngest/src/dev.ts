// Inngest Dev Server entry point.
// Run with: npx tsx watch src/dev.ts
// This starts an HTTP server that Inngest's dev CLI can connect to.

import { Inngest } from "inngest";
import { serve } from "inngest/express";
import express from "express";
import {
  generateSlots,
  autoExpireBookings,
  cleanupPastSlots,
  dailyAgenda,
  feedbackPrompt,
  capturePayments,
  expirePatientReschedules,
  patientReminder,
  detectNoShows,
} from "./index";

const app = express();
app.use(express.json());

app.use(
  "/api/inngest",
  serve({
    client: new Inngest({ id: "online-consultation" }),
    functions: [
      generateSlots,
      autoExpireBookings,
      cleanupPastSlots,
      dailyAgenda,
      feedbackPrompt,
      capturePayments,
      expirePatientReschedules,
      patientReminder,
      detectNoShows,
    ],
  })
);

const port = process.env.PORT ?? 3002;
app.listen(port, () => {
  console.log(`Inngest dev server running on http://localhost:${port}`);
  console.log(`Functions served at http://localhost:${port}/api/inngest`);
});
