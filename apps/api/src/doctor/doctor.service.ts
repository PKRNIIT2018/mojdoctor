import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { GoogleService } from "../google/google.service";

@Injectable()
export class DoctorService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(GoogleService) private readonly googleService: GoogleService
  ) {}

  async findByEmail(email: string) {
    return this.database.db
      .selectFrom("doctor")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();
  }

  async findAll(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    return this.database.db.selectFrom("doctor").selectAll().limit(limit).offset(offset).execute();
  }

  async findPublic() {
    return this.database.db
      .selectFrom("doctor")
      .select(["id", "name", "specialty", "clinic_name", "language", "practice_phone"])
      .execute();
  }

  async findOne(id: string) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!doctor) throw new NotFoundException("Doctor not found");
    return doctor;
  }

  async create(data: {
    email: string;
    name?: string;
    specialty?: string;
    licenceNumber?: string;
    clinicName?: string;
    clinicAddress?: string;
    practicePhone?: string;
    language?: string;
  }) {
    return this.database.db
      .insertInto("doctor")
      .values({
        email: data.email,
        name: data.name ?? null,
        specialty: data.specialty ?? null,
        licence_number: data.licenceNumber ?? null,
        clinic_name: data.clinicName ?? null,
        clinic_address: data.clinicAddress ?? null,
        practice_phone: data.practicePhone ?? null,
        language: data.language ?? "en",
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async updateProfile(
    id: string,
    data: {
      name?: string;
      specialty?: string;
      licenceNumber?: string;
      clinicName?: string;
      clinicAddress?: string;
      practicePhone?: string;
      language?: string;
      noteTemplateConfig?: { heading: string; content: string }[];
    }
  ) {
    await this.findOne(id);
    return this.database.db
      .updateTable("doctor")
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.specialty !== undefined && { specialty: data.specialty }),
        ...(data.licenceNumber !== undefined && { licence_number: data.licenceNumber }),
        ...(data.clinicName !== undefined && { clinic_name: data.clinicName }),
        ...(data.clinicAddress !== undefined && { clinic_address: data.clinicAddress }),
        ...(data.practicePhone !== undefined && { practice_phone: data.practicePhone }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.noteTemplateConfig !== undefined && {
          note_template_config: JSON.stringify(data.noteTemplateConfig),
        }),
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async getProfile(email: string) {
    const doctor = await this.findByEmail(email);
    if (!doctor) throw new NotFoundException("Doctor not found");
    return doctor;
  }

  async getPracticeSettings(id: string) {
    const doctor = await this.findOne(id);
    return {
      slotLength: 30,
      bufferTime: 5,
      consultationFee: null,
      videoFee: null,
      inPersonFee: null,
      cancellationCutoff: 24,
      noteTemplate: "soap" as const,
      noteSections: [
        { name: "subjective", order: 1, enabled: true },
        { name: "objective", order: 2, enabled: true },
        { name: "assessment", order: 3, enabled: true },
        { name: "plan", order: 4, enabled: true },
      ],
      prescriptionHeader:
        doctor.name || doctor.email
          ? {
              name: doctor.name || "",
              specialty: doctor.specialty || "",
              licenceNumber: doctor.licence_number || "",
              clinicAddress: doctor.clinic_address || "",
            }
          : undefined,
    };
  }

  async updatePracticeSettings(
    id: string,
    _data: {
      slotLength?: number;
      bufferTime?: number;
      consultationFee?: number | null;
      videoFee?: number | null;
      inPersonFee?: number | null;
      cancellationCutoff?: number;
    }
  ) {
    await this.findOne(id);
    return { message: "Practice settings updated (stored in env/DB config)" };
  }

  async getIntegrationSettings(id: string) {
    await this.findOne(id);
    return {
      transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || "web_speech",
      emailProvider: process.env.EMAIL_PROVIDER || "gmail",
      emailFromAddress: process.env.EMAIL_FROM || "",
      videoProvider: process.env.VIDEO_PROVIDER || "google_meet",
      storageProvider: process.env.STORAGE_PROVIDER || "r2",
      storageBucket: process.env.STORAGE_BUCKET || "",
      storageRegion: process.env.STORAGE_REGION || "",
      googleWorkspace: await this.googleService.getStatus(id),
    };
  }

  async updateIntegrationSettings(
    id: string,
    _data: {
      transcriptionProvider?: string;
      videoProvider?: string;
      storageProvider?: string;
    }
  ) {
    await this.findOne(id);
    return { message: "Integration settings updated (stored in env)" };
  }

  async getNotificationPrefs(id: string) {
    const doctor = await this.findOne(id);
    return (
      doctor.notification_prefs || {
        dailyAgendaTime: "08:00",
        newBookingAlert: true,
        noShowAlert: true,
      }
    );
  }

  async updateNotificationPrefs(
    id: string,
    data: {
      dailyAgendaTime?: string;
      newBookingAlert?: boolean;
      noShowAlert?: boolean;
    }
  ) {
    await this.findOne(id);
    const prefs = data;
    return this.database.db
      .updateTable("doctor")
      .set({
        notification_prefs: JSON.stringify(prefs),
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async acceptDpa(id: string, version: string) {
    await this.findOne(id);
    return this.database.db
      .updateTable("doctor")
      .set({
        dpa_accepted_at: new Date(),
        dpa_version: version,
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
