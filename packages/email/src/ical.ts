export function generateIcsAttachment(params: {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  organizerName?: string;
  organizerEmail?: string;
  attendeeName: string;
  attendeeEmail: string;
}): { filename: string; content: string } {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OnlineConsultation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${params.uid}`,
    `DTSTART:${fmt(params.start)}`,
    `DTEND:${fmt(params.end)}`,
    `SUMMARY:${params.summary}`,
    ...(params.description ? [`DESCRIPTION:${params.description.replace(/\n/g, "\\n")}`] : []),
    ...(params.location ? [`LOCATION:${params.location}`] : []),
    `ORGANIZER;CN=${params.organizerName || "Doctor"}:mailto:${params.organizerEmail || "noreply@onlineconsultation.app"}`,
    `ATTENDEE;CN=${params.attendeeName};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION:mailto:${params.attendeeEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    filename: "appointment.ics",
    content: ics,
  };
}
