import { google } from "googleapis";
import { inngest } from "../client";
import { getDb } from "../database";
import { createOAuth2Client } from "../google-helper";

export const googleTokenCheck = inngest.createFunction(
  {
    id: "google-token-check",
    name: "Google OAuth2 Token Check",
  },
  { cron: "0 6 * * *" },
  async ({ step }) => {
    const db = getDb();

    const result = await step.run("verify-doctor-tokens", async () => {
      const doctors = await db
        .selectFrom("doctor")
        .select(["id", "email", "google_refresh_token"])
        .where("google_refresh_token", "is not", null)
        .execute();

      if (doctors.length === 0) {
        return {
          valid: false,
          reason: "No doctors have connected their Google account",
          checkedAt: new Date().toISOString(),
        };
      }

      const results: {
        doctorId: string;
        email: string;
        valid: boolean;
        error?: string;
      }[] = [];

      for (const doctor of doctors) {
        const auth = createOAuth2Client(doctor.google_refresh_token!);

        if (!auth) {
          results.push({
            doctorId: doctor.id,
            email: doctor.email ?? "",
            valid: false,
            error: "OAuth2 client not configured (missing env vars)",
          });
          continue;
        }

        try {
          const token = await auth.getAccessToken();
          results.push({
            doctorId: doctor.id,
            email: doctor.email ?? "",
            valid: !!token?.token,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          results.push({
            doctorId: doctor.id,
            email: doctor.email ?? "",
            valid: false,
            error: msg,
          });
        }
      }

      return {
        valid: results.some((r) => r.valid),
        checkedAt: new Date().toISOString(),
        total: doctors.length,
        validCount: results.filter((r) => r.valid).length,
        invalidCount: results.filter((r) => !r.valid).length,
        details: results,
      };
    });

    return result;
  }
);
