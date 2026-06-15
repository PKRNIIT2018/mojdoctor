import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { CaseFileService } from "./case-file.service";
import { DoctorService } from "../doctor/doctor.service";
import { CreateCaseFileDto, AddDocumentDto } from "./dto/case-file.dto";
import type { User } from "@supabase/supabase-js";

@Controller("api/case-files")
@UseGuards(AuthGuard)
export class CaseFileController {
  constructor(
    @Inject(CaseFileService) private readonly caseFileService: CaseFileService,
    @Inject(DoctorService) private readonly doctorService: DoctorService
  ) {}

  @Get("booking/:bookingId")
  async findByBooking(
    @CurrentUser() user: User,
    @Param("bookingId", ParseUUIDPipe) bookingId: string
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.caseFileService.findByBooking(bookingId, doctor!.id);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.caseFileService.findOne(id, doctor!.id);
  }

  @Get(":id/documents")
  async getDocuments(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.caseFileService.getDocuments(id, doctor!.id);
  }

  @Get(":id/notes")
  async getNotes(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.caseFileService.getNotes(id, doctor!.id);
  }

  @Get(":id/intake")
  async getIntakeResponses(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.caseFileService.getIntakeResponses(id, doctor!.id);
  }

  @Post()
  async create(@Body() body: CreateCaseFileDto) {
    return this.caseFileService.create(body);
  }

  @Post(":id/documents")
  async addDocument(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: AddDocumentDto
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.caseFileService.addDocument({ caseFileId: id, doctorId: doctor!.id, ...body });
  }

  @Post(":id/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/tiff",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "text/plain",
          "application/rtf",
          "text/rtf",
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${file.mimetype} not allowed`), false);
        }
      },
    })
  )
  async uploadDocument(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
      })
    )
    file: Express.Multer.File,
    @Body("category") category?: string
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.caseFileService.uploadDocumentFile(
      id,
      doctor!.id,
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      category
    );
  }

  @Delete("documents/:documentId")
  async removeDocument(
    @CurrentUser() user: User,
    @Param("documentId", ParseUUIDPipe) documentId: string
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.caseFileService.removeDocument(documentId, doctor!.id);
  }
}
