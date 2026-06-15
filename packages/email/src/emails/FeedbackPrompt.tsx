import { Section, Text, Heading, Link } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface FeedbackPromptEmailProps {
  patientName: string;
  doctorName: string;
  bookingId: string;
  feedbackUrl: string;
}

export function FeedbackPromptEmail(props: FeedbackPromptEmailProps) {
  return (
    <BaseLayout preview="How was your consultation?">
      <Section style={section}>
        <Heading style={heading}>How was your consultation?</Heading>
        <Text style={paragraph}>Dear {props.patientName},</Text>
        <Text style={paragraph}>
          We hope your consultation with {props.doctorName} went well. We'd love to hear your
          feedback.
        </Text>
        <Section style={buttonSection}>
          <Link href={props.feedbackUrl} style={button}>
            Leave Feedback
          </Link>
        </Section>
        <Text style={paragraph}>Your feedback helps us improve our service.</Text>
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
