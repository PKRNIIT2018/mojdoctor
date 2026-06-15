import { Inject, Injectable } from "@nestjs/common";
import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";
import { GoogleService } from "./google.service";

@Injectable()
export class GoogleCalendarService {
  constructor(@Inject(GoogleService) private readonly googleService: GoogleService) {}

  async createEvent(
    doctorId: string,
    calendarId: string,
    data: {
      summary: string;
      description: string;
      start: { dateTime: string; timeZone?: string };
      end: { dateTime: string; timeZone?: string };
      attendeeEmails?: string[];
      addMeet?: boolean;
    }
  ) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const calendar = google.calendar({ version: "v3", auth });

    const requestBody: Record<string, unknown> = {
      summary: data.summary,
      description: data.description,
      start: data.start,
      end: data.end,
    };

    if (data.attendeeEmails && data.attendeeEmails.length > 0) {
      requestBody.attendees = data.attendeeEmails.map((email) => ({
        email,
      }));
    }

    const params: Record<string, unknown> = {
      calendarId,
      requestBody,
    };

    if (data.addMeet) {
      requestBody.conferenceData = {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
      params.conferenceDataVersion = 1;
    }

    const response = await calendar.events.insert(params);
    return response.data;
  }

  async updateEvent(
    doctorId: string,
    calendarId: string,
    eventId: string,
    changes: Record<string, unknown>
  ) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: changes,
    });

    return response.data;
  }

  async deleteEvent(doctorId: string, calendarId: string, eventId: string) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId,
      eventId,
    });
  }

  async getEvent(doctorId: string, calendarId: string, eventId: string) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.get({
      calendarId,
      eventId,
    });

    return response.data;
  }

  async listEvents(doctorId: string, calendarId: string, timeMin: string, timeMax: string) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.data.items ?? [];
  }
}
