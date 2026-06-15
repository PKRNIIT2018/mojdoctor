import { Section, Text, Heading, Link } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface PostConsultSummaryEmailProps {
  patientName: string;
  date: string;
  summary?: string;
  hasPrescription: boolean;
  bookingId: string;
  followUpUrl?: string;
}

export function PostConsultSummaryEmail(props: PostConsultSummaryEmailProps) {
  return (
    <BaseLayout preview="Your consultation summary is ready">
      <Section style={section}>
        <Heading style={heading}>Consultation Summary</Heading>
        <Text style={paragraph}>Dear {props.patientName},</Text>
        <Text style={paragraph}>
          Thank you for your consultation on {props.date}. Here is a summary:
        </Text>
        {props.summary && (
          <Section style={summaryBox}>
            <Text style={paragraph}>{props.summary}</Text>
          </Section>
        )}
        {props.hasPrescription && (
          <Text style={paragraph}>
            A prescription has been issued and is attached to this email.
          </Text>
        )}
        {props.followUpUrl && (
          <Section style={buttonSection}>
            <Link href={props.followUpUrl} style={button}>
              Book a Follow-up Consultation
            </Link>
          </Section>
        )}
        <Text style={paragraph}>Reference: {props.bookingId}</Text>
      </Section>
    </BaseLayout>
  );
}

const section = { padding: "0 20px" };
const heading = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  margin: "30px 0 10px",
  color: "#0f172a",
};
const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#334155",
  margin: "10px 0",
};
const summaryBox = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
  border: "1px solid #bbf7d0",
};
const buttonSection = {
  textAlign: "center" as const,
  padding: "20px 0",
};
const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  padding: "12px 32px",
  display: "inline-block",
};
