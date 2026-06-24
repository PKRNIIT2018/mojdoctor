import { Injectable, NotFoundException, Inject, Logger } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { GoogleDriveService } from "../google/google-drive.service";
import { assertOwnership } from "../common/guards/ownership.helper";

@Injectable()
export class CaseFileService {
  private readonly logger = new Logger(CaseFileService.name);

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(GoogleDriveService) private readonly driveService: GoogleDriveService
  ) {}

  private generateFolderPath(doctorId: string, patientName: string, bookingId: string): string {
    const sanitized = patientName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
    return `practices/${doctorId}/patients/${sanitized}/${bookingId}`;
  }

  private extractDriveFolderId(folderPath: string | null): string | null {
    if (!folderPath || !folderPath.startsWith("drive:")) return null;
    return folderPath.slice(6);
  }

  async findByBooking(bookingId: string, doctorId: string) {
    await assertOwnership(this.database, "booking", bookingId, doctorId);
    const files = await this.database.db
      .selectFrom("case_file")
      .selectAll()
      .where("booking_id", "=", bookingId)
      .execute();
    return files;
  }

  async findOne(id: string, doctorId?: string) {
    const file = await this.database.db
      .selectFrom("case_file")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    if (!file) throw new NotFoundException("Case file not found");
    if (doctorId) await assertOwnership(this.database, "case_file", id, doctorId);
    return file;
  }

  async create(data: {
    bookingId: string;
    doctorId: string;
    patientName: string;
    patientEmail: string;
  }) {
    const folderName = `${data.doctorId}_${data.patientName.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()}_${data.bookingId}`;
    const driveFolder = await this.driveService.createFolder(data.doctorId, null, folderName);
    const folderPath = `drive:${driveFolder.id}`;
    return this.database.db
      .insertInto("case_file")
      .values({
        booking_id: data.bookingId,
        doctor_id: data.doctorId,
        patient_name: data.patientName,
        patient_email: data.patientEmail,
        folder_path: folderPath,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async addDocument(data: {
    caseFileId: string;
    doctorId: string;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
    r2Key?: string;
    category?: string;
    content?: string;
  }) {
    const caseFile = await this.findOne(data.caseFileId, data.doctorId);
    let driveFileId = data.r2Key;
    if (data.content) {
      const folderId = this.extractDriveFolderId(caseFile.folder_path);
      if (!folderId) throw new Error("Case file has no Drive folder");
      const uploaded = await this.driveService.uploadFile(data.doctorId, folderId, {
        name: data.fileName,
        mimeType: data.mimeType ?? "application/octet-stream",
        body: data.content,
      });
      driveFileId = uploaded.id;
    }
    return this.database.db
      .insertInto("case_file_document")
      .values({
        case_file_id: data.caseFileId,
        file_name: data.fileName,
        file_size: data.fileSize ?? null,
        mime_type: data.mimeType ?? null,
        r2_key: driveFileId ?? null,
        category: data.category ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async uploadDocument(
    caseFileId: string,
    doctorId: string,
    fileName: string,
    mimeType: string,
    content: string,
    category?: string
  ) {
    const caseFile = await this.findOne(caseFileId, doctorId);
    const folderId = this.extractDriveFolderId(caseFile.folder_path);
    if (!folderId) throw new Error("Case file has no Drive folder");
    const uploaded = await this.driveService.uploadFile(doctorId, folderId, {
      name: fileName,
      mimeType,
      body: content,
    });
    return this.database.db
      .insertInto("case_file_document")
      .values({
        case_file_id: caseFileId,
        file_name: fileName,
        file_size: null,
        mime_type: mimeType,
        r2_key: uploaded.id,
        category: category ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async uploadDocumentFile(
    caseFileId: string,
    doctorId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    category?: string
  ) {
    const caseFile = await this.findOne(caseFileId, doctorId);
    const folderId = this.extractDriveFolderId(caseFile.folder_path);
    if (!folderId) throw new Error("Case file has no Drive folder");

    const uploaded = await this.driveService.uploadFile(doctorId, folderId, {
      name: file.originalname,
      mimeType: file.mimetype,
      body: file.buffer,
    });

    await this.driveService.setPermission(doctorId, uploaded.id, {
      type: "anyone",
      role: "reader",
    });

    const doc = await this.database.db
      .insertInto("case_file_document")
      .values({
        case_file_id: caseFileId,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        r2_key: uploaded.id,
        category: category ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { ...doc, webViewLink: uploaded.webViewLink };
  }

  async removeDocument(documentId: string, doctorId: string) {
    const doc = await this.database.db
      .selectFrom("case_file_document")
      .selectAll()
      .where("id", "=", documentId)
      .executeTakeFirst();
    if (!doc) throw new NotFoundException("Document not found");

    await assertOwnership(this.database, "document", documentId, doctorId);

    if (doc.r2_key) {
      try {
        await this.driveService.deleteFile(doctorId, doc.r2_key);
      } catch {
        this.logger.warn(`Failed to trash Drive file ${doc.r2_key}`);
      }
    }

    await this.database.db.deleteFrom("case_file_document").where("id", "=", documentId).execute();
    return { message: "Document removed" };
  }

  async getDocuments(caseFileId: string, doctorId: string) {
    await this.findOne(caseFileId, doctorId);
    return this.database.db
      .selectFrom("case_file_document")
      .selectAll()
      .where("case_file_id", "=", caseFileId)
      .orderBy("created_at", "desc")
      .execute();
  }

  async getNotes(caseFileId: string, doctorId: string) {
    await this.findOne(caseFileId, doctorId);
    return this.database.db
      .selectFrom("doctor_note")
      .selectAll()
      .where("case_file_id", "=", caseFileId)
      .orderBy("created_at", "desc")
      .execute();
  }

  async createForBooking(data: {
    bookingId: string;
    doctorId: string;
    patientName: string;
    patientEmail: string;
  }) {
    const existing = await this.database.db
      .selectFrom("case_file")
      .select("id")
      .where("booking_id", "=", data.bookingId)
      .executeTakeFirst();

    if (existing) return existing;

    return this.database.db
      .insertInto("case_file")
      .values({
        booking_id: data.bookingId,
        doctor_id: data.doctorId,
        patient_name: data.patientName,
        patient_email: data.patientEmail,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async getIntakeResponses(caseFileId: string, doctorId: string) {
    const caseFile = await this.findOne(caseFileId, doctorId);
    return this.database.db
      .selectFrom("intake_response")
      .selectAll()
      .where("booking_id", "=", caseFile.booking_id)
      .execute();
  }
}
