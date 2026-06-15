import {
  Controller,
  Get,
  Query,
  UseGuards,
  Inject,
  Redirect,
  HttpCode,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { GoogleService } from "./google.service";
import { DatabaseService } from "../database/database.service";
import type { User } from "@supabase/supabase-js";

@Controller("api/google")
export class GoogleController {
  constructor(
    @Inject(GoogleService) private readonly googleService: GoogleService,
    @Inject(DatabaseService) private readonly database: DatabaseService
  ) {}

  @Get("auth")
  @UseGuards(AuthGuard)
  async auth(@CurrentUser() user: User) {
    try {
      const doctor = await this.database.db
        .selectFrom("doctor")
        .select("id")
        .where("email", "=", user.email!)
        .executeTakeFirst();
      if (!doctor) throw new NotFoundException("Doctor not found");
      const url = this.googleService.getGoogleAuthUrl(doctor.id);
      return { url };
    } catch (err) {
      const message = (err as Error).message;
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(message);
    }
  }

  @Get("callback")
  @HttpCode(HttpStatus.OK)
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error?: string
  ) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (error) {
      return { message: "Google auth failed", error };
    }

    if (!code || !state) {
      return { message: "Missing code or state" };
    }

    try {
      const { refreshToken, email } = await this.googleService.handleCallback(code);
      await this.googleService.storeTokens(state, refreshToken, email);

      return {
        message: "Google account connected",
        email,
        redirectUrl: `${appUrl}/dashboard/settings?google=connected`,
      };
    } catch (err) {
      return {
        message: "Failed to connect Google account",
        error: (err as Error).message,
        redirectUrl: `${appUrl}/dashboard/settings?google=error`,
      };
    }
  }

  @Get("status")
  @UseGuards(AuthGuard)
  async status(@CurrentUser() user: User) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select("id")
      .where("email", "=", user.email!)
      .executeTakeFirst();
    if (!doctor) throw new NotFoundException("Doctor not found");
    return this.googleService.getStatus(doctor.id);
  }

  @Get("disconnect")
  @UseGuards(AuthGuard)
  async disconnect(@CurrentUser() user: User) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select("id")
      .where("email", "=", user.email!)
      .executeTakeFirst();
    if (!doctor) throw new NotFoundException("Doctor not found");
    await this.googleService.disconnect(doctor.id);
    return { message: "Google account disconnected" };
  }
}
