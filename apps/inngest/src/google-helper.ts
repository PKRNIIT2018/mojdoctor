import { createOAuth2Client as createSharedOAuth2Client } from "@repo/video";

export function createOAuth2Client(refreshToken: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return createSharedOAuth2Client(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI ?? "",
    refreshToken
  );
}
