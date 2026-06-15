import { google } from "googleapis";
import { render } from "@react-email/render";
import type { ReactElement } from "react";

type SendEmailParams = {
  to: string;
  subject: string;
  react: ReactElement;
  attachments?: { filename: string; content: string }[];
  auth?: any;
};

function buildMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string }[];
}): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
  ];

  if (params.attachments && params.attachments.length > 0) {
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    const parts: string[] = [];
    parts.push(`--${boundary}`);
    parts.push("Content-Type: text/html; charset=UTF-8");
    parts.push("Content-Transfer-Encoding: 7bit");
    parts.push("");
    parts.push(params.html);

    for (const attachment of params.attachments) {
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

  headers.push("Content-Type: text/html; charset=UTF-8");
  headers.push("Content-Transfer-Encoding: 7bit");
  return [...headers, "", "", params.html].join("\r\n");
}

export async function sendEmail(params: SendEmailParams) {
  const { auth, to, subject, react, attachments } = params;

  const from = process.env.EMAIL_FROM || "noreply@onlineconsultation.app";

  if (auth) {
    const gmail = google.gmail({ version: "v1", auth });

    const html = await render(react);

    const raw = Buffer.from(
      buildMimeMessage({
        from,
        to,
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content).toString("base64"),
        })),
      })
    )
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

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const delegatedAdmin = process.env.GOOGLE_DELEGATED_ADMIN_EMAIL;

  if (!serviceAccountEmail || !privateKey || !delegatedAdmin) {
    return { message: "Gmail API credentials not configured (dry run)", to, subject };
  }

  const jwt = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    subject: delegatedAdmin,
  });

  const gmail = google.gmail({ version: "v1", auth: jwt });

  const html = await render(react);

  const raw = Buffer.from(
    buildMimeMessage({
      from,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
      })),
    })
  )
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
