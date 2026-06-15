import { Section, Text, Heading, Link } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface PreConsultIntakeEmailProps {
  patientName: string;
  bookingId: string;
  intakeUrl: string;
  date: string;
  time: string;
}

export function PreConsultIntakeEmail(props: PreConsultIntakeEmailProps) {
  return (
    <BaseLayout preview="Please complete your pre-consultation questionnaire">
      <Section style={section}>
        <Heading style={heading}>Pre-Consultation Questionnaire</Heading>
        <Text style={paragraph}>Dear {props.patientName},</Text>
        <Text style={paragraph}>
          Thank you for booking a consultation on {props.date} at {props.time}.
        </Text>
        <Text style={paragraph}>
          To help the doctor prepare, please fill out the pre-consultation questionnaire.
        </Text>
        <Section style={buttonSection}>
          <Link href={props.intakeUrl} style={button}>
            Complete Questionnaire
          </Link>
        </Section>
        <Text style={paragraph}>
          You can also access it later using booking reference: {props.bookingId}
        </Text>
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
