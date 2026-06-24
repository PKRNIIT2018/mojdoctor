import { google } from "googleapis";

export function createOAuth2Client(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  refreshToken?: string
) {
  const auth = new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
  if (refreshToken) {
    auth.setCredentials({ refresh_token: refreshToken });
  }
  return auth;
}
