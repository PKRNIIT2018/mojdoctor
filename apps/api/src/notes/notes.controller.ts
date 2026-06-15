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
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { NotesService } from "./notes.service";
import { DoctorService } from "../doctor/doctor.service";
import { CreateNoteDto, UpdateNoteDto, AddPrescriptionDto } from "./dto/notes.dto";
import type { User } from "@supabase/supabase-js";

@Controller("api/notes")
@UseGuards(AuthGuard)
export class NotesController {
  constructor(
    @Inject(NotesService) private readonly notesService: NotesService,
    @Inject(DoctorService) private readonly doctorService: DoctorService
  ) {}

  @Get("case-file/:caseFileId")
  async findByCaseFile(
    @CurrentUser() user: User,
    @Param("caseFileId", ParseUUIDPipe) caseFileId: string
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notesService.findByCaseFile(caseFileId, doctor!.id);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notesService.findOne(id, doctor!.id);
  }

  @Post()
  async create(@CurrentUser() user: User, @Body() body: CreateNoteDto) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notesService.create({ ...body, doctorId: doctor!.id });
  }

  @Put(":id")
  async update(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateNoteDto
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notesService.update(id, doctor!.id, body);
  }

  @Delete(":id")
  async delete(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notesService.delete(id, doctor!.id);
  }

  @Get(":id/prescriptions")
  async getPrescriptions(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notesService.getPrescriptions(id, doctor!.id);
  }

  @Post(":id/prescriptions")
  async addPrescription(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: AddPrescriptionDto
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notesService.addPrescription({ doctorNoteId: id, doctorId: doctor!.id, ...body });
  }

  @Delete("prescriptions/:prescriptionId")
  async removePrescription(
    @CurrentUser() user: User,
    @Param("prescriptionId", ParseUUIDPipe) prescriptionId: string
  ) {
    const doctor = await this.doctorService.findByEmail(user.email!);
    return this.notesService.removePrescription(prescriptionId, doctor!.id);
  }
}
