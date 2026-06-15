import { Section, Text, Heading, Hr } from "@react-email/components";
import { BaseLayout } from "./BaseLayout";

interface AppointmentItem {
  time: string;
  patientName: string;
  mode: string;
}

interface DailyAgendaEmailProps {
  doctorName: string;
  date: string;
  appointments: AppointmentItem[];
}

export function DailyAgendaEmail(props: DailyAgendaEmailProps) {
  return (
    <BaseLayout preview={`Today's agenda - ${props.appointments.length} appointments`}>
      <Section style={section}>
        <Heading style={heading}>Today's Agenda</Heading>
        <Text style={paragraph}>Dear {props.doctorName},</Text>
        <Text style={paragraph}>
          You have {props.appointments.length} appointment
          {props.appointments.length !== 1 ? "s" : ""} today ({props.date}):
        </Text>
        {props.appointments.map((apt, i) => (
          <Section key={i} style={appointmentRow}>
            <Text style={appointmentTime}>{apt.time}</Text>
            <Text style={appointmentDetail}>
              {apt.patientName} ({apt.mode === "video" ? "Video" : "In-person"})
            </Text>
          </Section>
        ))}
        {props.appointments.length === 0 && (
          <Text style={paragraph}>No appointments scheduled for today.</Text>
        )}
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
const appointmentRow = {
  display: "flex" as const,
  padding: "12px 16px",
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  marginBottom: "8px",
};
const appointmentTime = {
  fontSize: "14px",
  fontWeight: "bold" as const,
  color: "#0f172a",
  margin: 0,
  minWidth: "60px",
};
const appointmentDetail = {
  fontSize: "14px",
  color: "#334155",
  margin: 0,
};
