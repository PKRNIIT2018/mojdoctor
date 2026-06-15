import { google } from "googleapis";
import type { Kysely } from "kysely";
import type { Database } from "@repo/db";

export function createOAuth2Client(refreshToken: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const auth = new google.auth.OAuth2({
    clientId,
    clientSecret,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  });
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

export async function getDoctorAuthClient(db: Kysely<Database>, doctorId: string) {
  const doctor = await db
    .selectFrom("doctor")
    .select(["google_refresh_token"])
    .where("id", "=", doctorId)
    .executeTakeFirst();

  if (!doctor?.google_refresh_token) return null;
  return createOAuth2Client(doctor.google_refresh_token);
}
