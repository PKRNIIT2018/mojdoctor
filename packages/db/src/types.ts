import { Generated, ColumnType } from "kysely";

export interface DoctorTable {
  id: Generated<string>;
  email: string;
  name: string | null;
  specialty: string | null;
  licence_number: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  practice_phone: string | null;
  language: Generated<string>;
  dpa_accepted_at: Date | null;
  dpa_version: string | null;
  notification_prefs: ColumnType<
    {
      dailyAgendaTime?: string;
      newBookingAlert?: boolean;
      noShowAlert?: boolean;
    },
    string | undefined,
    string | undefined
  > | null;
  stripe_account_id: string | null;
  stripe_onboarded: Generated<boolean>;
  note_template_config: unknown | null;
  role: Generated<string>;
  google_refresh_token: string | null;
  google_email: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface SlotTable {
  id: Generated<string>;
  doctor_id: string;
  date: Date;
  start_time: string;
  end_time: string;
  mode: Generated<string>;
  status: Generated<string>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface BookingTable {
  id: Generated<string>;
  slot_id: string;
  doctor_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  reason: string | null;
  payment_method: Generated<string>;
  status: Generated<string>;
  gdpr_consent: Generated<string>;
  language: Generated<string>;
  document_pin: string | null;
  pin_attempts: Generated<number>;
  pin_locked_until: Date | null;
  video_room_url: string | null;
  calendar_event_id: string | null;
  current_state_entered_at: Generated<Date>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PaymentTable {
  id: Generated<string>;
  booking_id: string;
  stripe_setup_intent_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  amount: number | null;
  currency: Generated<string>;
  status: Generated<string>;
  captured_at: Date | null;
  refunded_at: Date | null;
  refund_amount: number | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CaseFileTable {
  id: Generated<string>;
  booking_id: string;
  doctor_id: string;
  patient_name: string;
  patient_email: string;
  folder_path: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface DoctorNoteTable {
  id: Generated<string>;
  case_file_id: string;
  content_markdown: string | null;
  sections: ColumnType<
    { heading: string; content: string }[],
    string | undefined,
    string | undefined
  > | null;
  summary: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface CaseFileDocumentTable {
  id: Generated<string>;
  case_file_id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  r2_key: string | null;
  category: string | null;
  created_at: Generated<Date>;
}

export interface IntakeResponseTable {
  id: Generated<string>;
  booking_id: string;
  responses: ColumnType<Record<string, unknown>, string, string>;
  submitted_at: Generated<Date>;
  created_at: Generated<Date>;
}

export interface PreConsultTemplateTable {
  id: Generated<string>;
  doctor_id: string;
  title: string;
  description: string | null;
  questions: ColumnType<{ label: string; type: string; required: boolean }[], string, string>;
  is_active: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface PrescriptionTable {
  id: Generated<string>;
  doctor_note_id: string;
  medication_name: string;
  dosage: string;
  instructions: string | null;
  valid_until: string | null;
  created_at: Generated<Date>;
}

export interface FeedbackTable {
  id: Generated<string>;
  booking_id: string;
  rating: number | null;
  comment: string | null;
  created_at: Generated<Date>;
}

export interface MessageTemplateTable {
  id: Generated<string>;
  doctor_id: string;
  name: string;
  subject: string | null;
  body_markdown: string | null;
  event: string | null;
  is_default: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface AuditLogTable {
  id: Generated<string>;
  entity_type: string;
  entity_id: string | null;
  action: string;
  actor_id: string | null;
  changes: ColumnType<
    Record<string, { from: unknown; to: unknown }>,
    string | undefined,
    string | undefined
  > | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Generated<Date>;
}

export interface SlotRuleTable {
  id: Generated<string>;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: Generated<number>;
  break_between: Generated<number>;
  mode: Generated<string>;
  date_range: ColumnType<
    { from: string; to: string },
    string | undefined,
    string | undefined
  > | null;
  is_active: Generated<number>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface SlotOverrideTable {
  id: Generated<string>;
  doctor_id: string;
  date: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface Database {
  doctor: DoctorTable;
  slot: SlotTable;
  booking: BookingTable;
  payment: PaymentTable;
  case_file: CaseFileTable;
  doctor_note: DoctorNoteTable;
  case_file_document: CaseFileDocumentTable;
  intake_response: IntakeResponseTable;
  pre_consult_template: PreConsultTemplateTable;
  prescription: PrescriptionTable;
  feedback: FeedbackTable;
  message_template: MessageTemplateTable;
  audit_log: AuditLogTable;
  slot_rule: SlotRuleTable;
  slot_override: SlotOverrideTable;
}
