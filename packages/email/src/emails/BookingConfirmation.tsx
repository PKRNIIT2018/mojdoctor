import { Section, Text, Heading } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface BookingConfirmationEmailProps {
  patientName: string;
  date: string;
  time: string;
  mode: string;
  bookingId: string;
  doctorName: string;
  clinicName?: string;
  clinicAddress?: string;
}

export function BookingConfirmationEmail(props: BookingConfirmationEmailProps) {
  return (
    <BaseLayout preview="Your consultation has been confirmed">
      <Section style={section}>
        <Heading style={heading}>Consultation Confirmed</Heading>
        <Text style={paragraph}>Dear {props.patientName},</Text>
        <Text style={paragraph}>Your consultation has been confirmed. Here are the details:</Text>
        <Section style={details}>
          <Text style={detailItem}>
            <strong>Date:</strong> {props.date}
          </Text>
          <Text style={detailItem}>
            <strong>Time:</strong> {props.time}
          </Text>
          <Text style={detailItem}>
            <strong>Type:</strong> {props.mode === "video" ? "Video call" : "In-person visit"}
          </Text>
          <Text style={detailItem}>
            <strong>Doctor:</strong> {props.doctorName}
          </Text>
          {props.clinicName && (
            <Text style={detailItem}>
              <strong>Clinic:</strong> {props.clinicName}
            </Text>
          )}
          {props.clinicAddress && (
            <Text style={detailItem}>
              <strong>Address:</strong> {props.clinicAddress}
            </Text>
          )}
          <Text style={detailItem}>
            <strong>Reference:</strong> {props.bookingId}
          </Text>
        </Section>
        <Text style={paragraph}>
          A calendar invitation is attached to this email. Please add it to your calendar.
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
