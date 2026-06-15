import { Inject, Injectable } from "@nestjs/common";
import { google } from "googleapis";
import { GoogleService } from "./google.service";

type SendMessageParams = {
  to: string;
  cc?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: { filename: string; content: string }[];
};

@Injectable()
export class GoogleGmailService {
  constructor(@Inject(GoogleService) private readonly googleService: GoogleService) {}

  async sendMessage(doctorId: string, params: SendMessageParams) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const gmail = google.gmail({ version: "v1", auth });

    const raw = Buffer.from(this.buildMimeMessage(params))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return result.data;
  }

  private buildMimeMessage(params: SendMessageParams): string {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const altBoundary = `alt_boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const headers: string[] = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      "MIME-Version: 1.0",
    ];

    if (params.cc) {
      headers.push(`Cc: ${params.cc}`);
    }

    const hasAttachments = params.attachments && params.attachments.length > 0;
    const hasText = !!params.textBody;

    if (hasAttachments) {
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

      const parts: string[] = [];

      if (hasText) {
        parts.push(`--${boundary}`);
        parts.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
        parts.push("");
        parts.push(`--${altBoundary}`);
        parts.push("Content-Type: text/plain; charset=UTF-8");
        parts.push("Content-Transfer-Encoding: 7bit");
        parts.push("");
        parts.push(params.textBody!);
        parts.push(`--${altBoundary}`);
        parts.push("Content-Type: text/html; charset=UTF-8");
        parts.push("Content-Transfer-Encoding: 7bit");
        parts.push("");
        parts.push(params.htmlBody);
        parts.push(`--${altBoundary}--`);
      } else {
        parts.push(`--${boundary}`);
        parts.push("Content-Type: text/html; charset=UTF-8");
        parts.push("Content-Transfer-Encoding: 7bit");
        parts.push("");
        parts.push(params.htmlBody);
      }

      for (const attachment of params.attachments!) {
        parts.push(`--${boundary}`);
        parts.push("Content-Type: application/octet-stream");
        parts.push("Content-Transfer-Encoding: base64");
        parts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        parts.push("");
        parts.push(attachment.content);
      }

      parts.push(`--${boundary}--`);
      return [...headers, "", ...parts].join("\r\n");
    }

    if (hasText) {
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

      const parts: string[] = [];
      parts.push(`--${boundary}`);
      parts.push("Content-Type: text/plain; charset=UTF-8");
      parts.push("Content-Transfer-Encoding: 7bit");
      parts.push("");
      parts.push(params.textBody!);
      parts.push(`--${boundary}`);
      parts.push("Content-Type: text/html; charset=UTF-8");
      parts.push("Content-Transfer-Encoding: 7bit");
      parts.push("");
      parts.push(params.htmlBody);
      parts.push(`--${boundary}--`);
      return [...headers, "", ...parts].join("\r\n");
    }

    headers.push("Content-Type: text/html; charset=UTF-8");
    headers.push("Content-Transfer-Encoding: 7bit");
    return [...headers, "", "", params.htmlBody].join("\r\n");
  }
}
