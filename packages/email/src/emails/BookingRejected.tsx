import { Section, Text, Heading } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface BookingRejectedEmailProps {
  patientName: string;
  bookingId: string;
  reason?: string;
}

export function BookingRejectedEmail(props: BookingRejectedEmailProps) {
  return (
    <BaseLayout preview="Your booking request has been declined">
      <Section style={section}>
        <Heading style={heading}>Booking Declined</Heading>
        <Text style={paragraph}>Dear {props.patientName},</Text>
        <Text style={paragraph}>Unfortunately, the doctor has declined your booking request.</Text>
        {props.reason && (
          <Section style={reasonBox}>
            <Text style={detailItem}>
              <strong>Reason:</strong> {props.reason}
            </Text>
          </Section>
        )}
        <Text style={paragraph}>You can book a different slot by visiting our booking page.</Text>
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
const reasonBox = {
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
  border: "1px solid #fecaca",
};
const detailItem = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#991b1b",
  margin: "4px 0",
};
