import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { google } from "googleapis";
import { DatabaseService } from "../database/database.service";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(DatabaseService) private readonly database: DatabaseService
  ) {}

  private getOAuth2Client() {
    const clientId = this.configService.get<string>("GOOGLE_OAUTH_CLIENT_ID");
    const clientSecret = this.configService.get<string>("GOOGLE_OAUTH_CLIENT_SECRET");
    const redirectUri = this.configService.get<string>("GOOGLE_REDIRECT_URI");

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        "Google OAuth credentials not configured. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
      );
    }

    return new google.auth.OAuth2({ clientId, clientSecret, redirectUri });
  }

  async getAuthClient(doctorId: string) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select(["google_refresh_token"])
      .where("id", "=", doctorId)
      .executeTakeFirst();

    if (!doctor?.google_refresh_token) {
      throw new NotFoundException(
        "Google account not connected. Please connect your Google account in settings."
      );
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: doctor.google_refresh_token });
    return oauth2Client;
  }

  getGoogleAuthUrl(state: string): string {
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state,
    });
  }

  async handleCallback(code: string) {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh_token returned from Google. Ensure 'offline' access type and 'consent' prompt."
      );
    }

    let email = "";
    if (tokens.id_token) {
      try {
        const ticket = await oauth2Client.verifyIdToken({ idToken: tokens.id_token });
        const payload = ticket.getPayload();
        email = payload?.email ?? "";
      } catch {
        this.logger.warn("Failed to extract email from id_token");
      }
    }

    return { refreshToken: tokens.refresh_token, email };
  }

  async storeTokens(doctorId: string, refreshToken: string, email: string) {
    await this.database.db
      .updateTable("doctor")
      .set({
        google_refresh_token: refreshToken,
        google_email: email || null,
        updated_at: new Date(),
      })
      .where("id", "=", doctorId)
      .execute();
  }

  async disconnect(doctorId: string) {
    await this.database.db
      .updateTable("doctor")
      .set({
        google_refresh_token: null,
        google_email: null,
        updated_at: new Date(),
      })
      .where("id", "=", doctorId)
      .execute();
  }

  async getStatus(doctorId: string) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select(["google_refresh_token", "google_email"])
      .where("id", "=", doctorId)
      .executeTakeFirst();

    const connected = !!doctor?.google_refresh_token;
    return {
      connected,
      accountEmail: doctor?.google_email ?? "",
      services: {
        calendar: connected,
        gmail: connected,
        drive: connected,
      },
    };
  }

  async getDoctorByGoogleEmail(email: string) {
    return this.database.db
      .selectFrom("doctor")
      .select("id")
      .where("google_email", "=", email)
      .executeTakeFirst();
  }
}
