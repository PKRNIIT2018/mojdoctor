import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";

export type CreateRoomOptions = {
  roomNamePrefix?: string;
  endDate: Date;
  enableRecording?: boolean;
  calendarId?: string;
  auth?: any;
};

export type CreateRoomResult = {
  roomUrl: string;
  hostRoomUrl: string;
  roomName: string;
};

export async function createVideoRoom(options: CreateRoomOptions): Promise<CreateRoomResult> {
  const { auth, roomNamePrefix, endDate } = options;
  const calendarId = options.calendarId ?? "primary";

  if (auth) {
    const calendar = google.calendar({ version: "v3", auth });

    const startDate = new Date(endDate.getTime() - 60 * 60 * 1000);

    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: "Medical Consultation",
        description: roomNamePrefix ? `Room: ${roomNamePrefix}` : null,
        start: { dateTime: startDate.toISOString(), timeZone: "UTC" },
        end: { dateTime: endDate.toISOString(), timeZone: "UTC" },
        conferenceData: {
          createRequest: {
            requestId: uuidv4(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.hangoutLink ?? "";

    return {
      roomUrl: meetLink,
      hostRoomUrl: meetLink,
      roomName: "",
    };
  }

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const delegatedAdmin = process.env.GOOGLE_DELEGATED_ADMIN_EMAIL;

  if (!serviceAccountEmail) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL not configured");
  if (!privateKey) throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not configured");
  if (!delegatedAdmin) throw new Error("GOOGLE_DELEGATED_ADMIN_EMAIL not configured");

  const jwt = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    subject: delegatedAdmin,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  const calendar = google.calendar({ version: "v3", auth: jwt });

  const startDate = new Date(endDate.getTime() - 60 * 60 * 1000);

  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: "Medical Consultation",
      description: roomNamePrefix ? `Room: ${roomNamePrefix}` : null,
      start: { dateTime: startDate.toISOString(), timeZone: "UTC" },
      end: { dateTime: endDate.toISOString(), timeZone: "UTC" },
      conferenceData: {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
    conferenceDataVersion: 1,
  });

  const meetLink = response.data.hangoutLink ?? "";

  return {
    roomUrl: meetLink,
    hostRoomUrl: meetLink,
    roomName: "",
  };
}
