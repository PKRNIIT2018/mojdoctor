import { Section, Text, Heading } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface PrescriptionDeliveryEmailProps {
  patientName: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  validUntil?: string;
  bookingId: string;
}

export function PrescriptionDeliveryEmail(props: PrescriptionDeliveryEmailProps) {
  return (
    <BaseLayout preview="Your prescription is ready">
      <Section style={section}>
        <Heading style={heading}>Prescription Issued</Heading>
        <Text style={paragraph}>Dear {props.patientName},</Text>
        <Text style={paragraph}>A prescription has been issued following your consultation.</Text>
        <Section style={details}>
          <Text style={detailItem}>
            <strong>Medication:</strong> {props.medicationName}
          </Text>
          <Text style={detailItem}>
            <strong>Dosage:</strong> {props.dosage}
          </Text>
          {props.instructions && (
            <Text style={detailItem}>
              <strong>Instructions:</strong> {props.instructions}
            </Text>
          )}
          {props.validUntil && (
            <Text style={detailItem}>
              <strong>Valid until:</strong> {props.validUntil}
            </Text>
          )}
        </Section>
        <Text style={paragraph}>The prescription PDF is attached to this email.</Text>
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
const details = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};
const detailItem = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#334155",
  margin: "4px 0",
};
