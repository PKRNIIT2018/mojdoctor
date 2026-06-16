import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
  ParseUUIDPipe,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentDoctor } from "../auth/doctor.decorator";
import { ResolveDoctorInterceptor } from "../auth/resolve-doctor.interceptor";
import { NotesService } from "./notes.service";
import { CreateNoteDto, UpdateNoteDto, AddPrescriptionDto } from "./dto/notes.dto";

@Controller("api/notes")
@UseGuards(AuthGuard)
@UseInterceptors(ResolveDoctorInterceptor)
export class NotesController {
  constructor(@Inject(NotesService) private readonly notesService: NotesService) {}

  @Get("case-file/:caseFileId")
  async findByCaseFile(
    @CurrentDoctor() doctor: { id: string },
    @Param("caseFileId", ParseUUIDPipe) caseFileId: string
  ) {
    return this.notesService.findByCaseFile(caseFileId, doctor.id);
  }

  @Get(":id")
  async findOne(@CurrentDoctor() doctor: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
    return this.notesService.findOne(id, doctor.id);
  }

  @Post()
  async create(@CurrentDoctor() doctor: { id: string }, @Body() body: CreateNoteDto) {
    return this.notesService.create({ ...body, doctorId: doctor.id });
  }

  @Put(":id")
  async update(
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateNoteDto
  ) {
    return this.notesService.update(id, doctor.id, body);
  }

  @Delete(":id")
  async delete(@CurrentDoctor() doctor: { id: string }, @Param("id", ParseUUIDPipe) id: string) {
    return this.notesService.delete(id, doctor.id);
  }

  @Get(":id/prescriptions")
  async getPrescriptions(
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.notesService.getPrescriptions(id, doctor.id);
  }

  @Post(":id/prescriptions")
  async addPrescription(
    @CurrentDoctor() doctor: { id: string },
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: AddPrescriptionDto
  ) {
    return this.notesService.addPrescription({ doctorNoteId: id, doctorId: doctor.id, ...body });
  }

  @Delete("prescriptions/:prescriptionId")
  async removePrescription(
    @CurrentDoctor() doctor: { id: string },
    @Param("prescriptionId", ParseUUIDPipe) prescriptionId: string
  ) {
    return this.notesService.removePrescription(prescriptionId, doctor.id);
  }
}
