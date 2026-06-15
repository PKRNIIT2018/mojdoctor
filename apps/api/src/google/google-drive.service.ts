import { Inject, Injectable, Logger } from "@nestjs/common";
import { google } from "googleapis";
import { GoogleService } from "./google.service";

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(@Inject(GoogleService) private readonly googleService: GoogleService) {}

  async createFolder(doctorId: string, parentId: string | null, name: string) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const drive = google.drive({ version: "v3", auth });

    const response = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : [],
      },
      fields: "id,name",
    });

    return { id: response.data.id!, name: response.data.name! };
  }

  async uploadFile(
    doctorId: string,
    parentId: string | null,
    file: { name: string; mimeType: string; body: string | Buffer }
  ) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const drive = google.drive({ version: "v3", auth });

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: parentId ? [parentId] : [],
      },
      media: {
        mimeType: file.mimeType,
        body: file.body,
      },
      fields: "id,name,webViewLink",
    });

    return {
      id: response.data.id!,
      name: response.data.name!,
      webViewLink: response.data.webViewLink!,
    };
  }

  async setPermission(
    doctorId: string,
    fileId: string,
    permission: {
      type: "user" | "group" | "anyone";
      role: "reader" | "writer" | "commenter";
      emailAddress?: string;
    }
  ) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const drive = google.drive({ version: "v3", auth });

    await drive.permissions.create({
      fileId,
      requestBody: {
        type: permission.type,
        role: permission.role,
        emailAddress: permission.emailAddress,
      },
    });
  }

  async deleteFile(doctorId: string, fileId: string) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const drive = google.drive({ version: "v3", auth });

    await drive.files.update({
      fileId,
      requestBody: { trashed: true },
    });
  }

  async getFile(doctorId: string, fileId: string) {
    const auth = await this.googleService.getAuthClient(doctorId);
    const drive = google.drive({ version: "v3", auth });

    const response = await drive.files.get({
      fileId,
      fields: "id,name,mimeType,size,webViewLink,createdTime,modifiedTime",
    });

    return response.data;
  }
}
