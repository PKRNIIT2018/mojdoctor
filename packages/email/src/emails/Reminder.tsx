import { Section, Text, Heading } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface ReminderEmailProps {
  patientName: string;
  date: string;
  time: string;
  mode: string;
  bookingId: string;
  videoRoomUrl?: string;
}

export function ReminderEmail(props: ReminderEmailProps) {
  return (
    <BaseLayout preview="Reminder: Your consultation is tomorrow">
      <Section style={section}>
        <Heading style={heading}>Consultation Reminder</Heading>
        <Text style={paragraph}>Dear {props.patientName},</Text>
        <Text style={paragraph}>
          Your consultation is scheduled for tomorrow. Please find the details below:
        </Text>
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
        {props.mode === "video" && props.videoRoomUrl && (
          <Section style={videoBox}>
            <Text style={paragraph}>Join your video consultation at the scheduled time:</Text>
            <Text style={link}>{props.videoRoomUrl}</Text>
          </Section>
        )}
        <Text style={paragraph}>Please ensure you are ready at the scheduled time.</Text>
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
const videoBox = {
  backgroundColor: "#eff6ff",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
  border: "1px solid #bfdbfe",
};
const link = {
  fontSize: "14px",
  color: "#2563eb",
  wordBreak: "break-all" as const,
};
