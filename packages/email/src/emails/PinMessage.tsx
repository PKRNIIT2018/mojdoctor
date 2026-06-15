import { Section, Text, Heading } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface PinMessageEmailProps {
  patientName: string;
  pin: string;
}

export function PinMessageEmail(props: PinMessageEmailProps) {
  return (
    <BaseLayout preview="Your document access PIN">
      <Section style={section}>
        <Heading style={heading}>Document Access PIN</Heading>
        <Text style={paragraph}>Dear {props.patientName},</Text>
        <Text style={paragraph}>Your document access PIN is:</Text>
        <Section style={pinBox}>
          <Text style={pin}>{props.pin}</Text>
        </Section>
        <Text style={paragraph}>
          You will need this 4-digit PIN to access your case documents after your consultation.
        </Text>
        <Text style={paragraph}>Please keep it safe. Do not share it with anyone.</Text>
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
const pinBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
  textAlign: "center" as const,
  border: "2px dashed #cbd5e1",
};
const pin = {
  fontSize: "32px",
  fontWeight: "bold" as const,
  letterSpacing: "8px",
  color: "#0f172a",
  margin: 0,
  fontFamily: "monospace",
};
