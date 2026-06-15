import { Section, Text, Heading, Link } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface BookingApprovedEmailProps {
  patientName: string;
  date: string;
  time: string;
  mode: string;
  bookingId: string;
  paymentUrl: string;
}

export function BookingApprovedEmail(props: BookingApprovedEmailProps) {
  return (
    <BaseLayout preview="Your booking has been approved">
      <Section style={section}>
        <Heading style={heading}>Booking Approved</Heading>
        <Text style={paragraph}>Dear {props.patientName},</Text>
        <Text style={paragraph}>Your booking request has been approved by the doctor.</Text>
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
            <strong>Reference:</strong> {props.bookingId}
          </Text>
        </Section>
        <Text style={paragraph}>
          Please complete the payment to confirm your booking. A pre-authorisation of your card will
          be taken now and captured on the consultation day.
        </Text>
        <Section style={buttonSection}>
          <Link href={props.paymentUrl} style={button}>
            Complete Payment
          </Link>
        </Section>
        <Text style={paragraph}>
          Or copy this link into your browser:{" "}
          <Link href={props.paymentUrl} style={textLink}>
            {props.paymentUrl}
          </Link>
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
const textLink = {
  color: "#2563eb",
  fontSize: "14px",
  wordBreak: "break-all" as const,
};
