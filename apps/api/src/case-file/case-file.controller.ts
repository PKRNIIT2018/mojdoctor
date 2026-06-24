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
import { CurrentDoctor } from "../auth/doctor.decorator";
import { ResolveDoctorInterceptor } from "../auth/resolve-doctor.interceptor";
import { CaseFileService } from "./case-file.service";
import { DoctorService } from "../doctor/doctor.service";
import { CreateCaseFileDto, AddDocumentDto } from "./dto/case-file.dto";

@Controller("api/case-files")
@UseGuards(AuthGuard)
@UseInterceptors(ResolveDoctorInterceptor)
export class CaseFileController {
  constructor(
    @Inject(CaseFileService) private readonly caseFileService: CaseFileService,
    @Inject(DoctorService) private readonly doctorService: DoctorService
  ) {}

  @Get("booking/:bookingId")
  async findByBooking(
    @CurrentDoctor() doctor: { id: string },
    @Param("bookingId", ParseUUIDPipe) bookingId: string
  ) {
    return this.caseFileService.findByBooking(bookingId, doctor.id);
  }

  @Get(":id")
  async findOne(@CurrentDoctor() doctor: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
    return this.caseFileService.findOne(id, doctor.id);
  }

  @Get(":id/documents")
  async getDocuments(
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.caseFileService.getDocuments(id, doctor.id);
  }

  @Get(":id/notes")
  async getNotes(@CurrentDoctor() doctor: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
    return this.caseFileService.getNotes(id, doctor.id);
  }

  @Get(":id/intake")
  async getIntakeResponses(
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.caseFileService.getIntakeResponses(id, doctor.id);
  }

  @Post()
  async create(@Body() body: CreateCaseFileDto) {
    return this.caseFileService.create(body);
  }

  @Post(":id/documents")
  async addDocument(
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: AddDocumentDto
  ) {
    return this.caseFileService.addDocument({ caseFileId: id, doctorId: doctor.id, ...body });
  }

  @Post(":id/upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      // @ts-expect-error fieldNestingDepth exists in multer 2.x but is missing from @types/multer@2.1.0
      limits: { fieldNestingDepth: 10, files: 1, fileSize: 10 * 1024 * 1024 },
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
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
      })
    )
    file: Express.Multer.File,
    @Body("category") category?: string
  ) {
    return this.caseFileService.uploadDocumentFile(
      id,
      doctor.id,
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
    @CurrentDoctor() doctor: { id: string },
    @Param("documentId", ParseUUIDPipe) documentId: string
  ) {
    return this.caseFileService.removeDocument(documentId, doctor.id);
  }
}
