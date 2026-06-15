import { Logger } from "@nestjs/common";

const logger = new Logger("GoogleAudit");

type GoogleAction = {
  action:
    | "google_calendar_create"
    | "google_calendar_update"
    | "google_calendar_delete"
    | "google_calendar_get"
    | "google_gmail_send"
    | "google_drive_create_folder"
    | "google_drive_upload"
    | "google_drive_set_permission"
    | "google_drive_delete"
    | "google_drive_get";
  resourceType: "booking" | "case_file" | "notification" | "doctor";
  resourceId: string;
  success: boolean;
  error?: string;
};

export function logGoogleAction(details: GoogleAction) {
  const prefix = details.success ? "[OK]" : "[FAIL]";
  const msg = `${prefix} ${details.action} — ${details.resourceType}:${details.resourceId}`;
  if (details.success) {
    logger.log(msg);
  } else {
    logger.error(`${msg} — ${details.error ?? "unknown error"}`);
  }
}
