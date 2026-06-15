import { Section, Text, Heading } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface CancellationNotificationEmailProps {
  patientName: string;
  date: string;
  time: string;
  bookingId: string;
  cancelledBy: "patient" | "doctor";
  doctorName?: string;
}

export function CancellationNotificationEmail(props: CancellationNotificationEmailProps) {
  const title =
    props.cancelledBy === "doctor" ? "Booking Cancelled by Doctor" : "Booking Cancelled";

  return (
    <BaseLayout preview={title}>
      <Section style={section}>
        <Heading style={heading}>{title}</Heading>
        <Text style={paragraph}>Dear {props.patientName},</Text>
        {props.cancelledBy === "doctor" ? (
          <>
            <Text style={paragraph}>
              Unfortunately, Dr. {props.doctorName ?? "your doctor"} has cancelled your consultation
              scheduled for {props.date} at {props.time}.
            </Text>
            <Text style={paragraph}>You can book a new slot by visiting our booking page.</Text>
          </>
        ) : (
          <Text style={paragraph}>
            Your consultation scheduled for {props.date} at {props.time} has been cancelled as
            requested.
          </Text>
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
