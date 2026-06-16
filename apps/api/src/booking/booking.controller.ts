import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  Inject,
  ParseUUIDPipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "../auth/auth.guard";
import { OptionalAuthGuard } from "../auth/optional-auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { DatabaseService } from "../database/database.service";
import { BookingService } from "./booking.service";
import {
  CreateBookingDto,
  ApproveBookingDto,
  ApproveAsAgreedDto,
  PostponeBookingDto,
  RejectBookingDto,
  PatientRescheduleDto,
  CancelPatientDto,
  VerifyDocumentPinDto,
  CheckPatientDto,
  UpdatePaymentMethodDto,
} from "./dto/booking.dto";
import type { User } from "@supabase/supabase-js";

@Controller("api/bookings")
export class BookingController {
  constructor(
    @Inject(BookingService) private readonly bookingService: BookingService,
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } })
  async create(@Body() body: CreateBookingDto) {
    return this.bookingService.create(body);
  }

  @Get("check-patient")
  async checkReturningPatient(@Query() query: CheckPatientDto) {
    const email = query.email;
    const booking = await this.db.db
      .selectFrom("booking")
      .select(["patient_name"])
      .where("patient_email", "=", email)
      .orderBy("created_at", "desc")
      .limit(1)
      .executeTakeFirst();

    return {
      returning: !!booking,
      patientName: booking?.patient_name ?? null,
    };
  }

  @Get(":id/status")
  async getStatus(@Param("id", ParseUUIDPipe) id: string) {
    const booking = await this.db.db
      .selectFrom("booking")
      .select(["id", "status", "current_state_entered_at"])
      .where("id", "=", id)
      .executeTakeFirst();

    if (!booking) {
      return { status: "NOT_FOUND" };
    }

    return { status: booking.status };
  }

  @Post(":id/cancel-patient")
  async cancelByPatient(@Param("id", ParseUUIDPipe) id: string, @Body() body: CancelPatientDto) {
    return this.bookingService.cancelByPatient(id, body.patientEmail);
  }

  @Post(":id/reschedule")
  async patientReschedule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: PatientRescheduleDto
  ) {
    return this.bookingService.patientReschedule(id, body.selectedSlotId, body.patientEmail);
  }

  @Post("approve")
  @UseGuards(AuthGuard)
  async approve(@CurrentUser() user: User, @Body() body: ApproveBookingDto) {
    return this.bookingService.approve(body.bookingId, body.paymentNote, user.id);
  }

  @Post("approve-as-agreed")
  @UseGuards(AuthGuard)
  async approveAsAgreed(@CurrentUser() user: User, @Body() body: ApproveAsAgreedDto) {
    return this.bookingService.approveAsAgreed(body.bookingId, body.internalNote, user.id);
  }

  @Post("postpone")
  @UseGuards(AuthGuard)
  async postpone(@CurrentUser() user: User, @Body() body: PostponeBookingDto) {
    return this.bookingService.postpone(body.bookingId, body.alternativeSlotIds, user.id);
  }

  @Post("reject")
  @UseGuards(AuthGuard)
  async reject(@CurrentUser() user: User, @Body() body: RejectBookingDto) {
    return this.bookingService.reject(body.bookingId, body.reason, user.id);
  }

  @Post(":id/cancel-doctor")
  @UseGuards(AuthGuard)
  async cancelByDoctor(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookingService.cancelByDoctor(id, user.id);
  }

  @Post(":id/complete")
  @UseGuards(AuthGuard)
  async complete(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookingService.complete(id, user.id);
  }

  @Post(":id/no-show")
  @UseGuards(AuthGuard)
  async markNoShow(@CurrentUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookingService.markNoShow(id, user.id);
  }

  @Get("patient/:email")
  @UseGuards(AuthGuard)
  async findByPatient(
    @Param("email") email: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.bookingService.findByPatient(email, Number(page) || 1, Number(limit) || 20);
  }

  @Get("patient/:email/history")
  @UseGuards(AuthGuard)
  async getPatientHistory(
    @Param("email") email: string,
    @Query("doctorId") doctorId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.bookingService.getPatientHistory(
      email,
      doctorId,
      Number(page) || 1,
      Number(limit) || 20
    );
  }

  @Get("doctor/:doctorId/consultations")
  @UseGuards(AuthGuard)
  async getConsultations(
    @Param("doctorId", ParseUUIDPipe) doctorId: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.bookingService.getConsultations(
      doctorId,
      status,
      Number(page) || 1,
      Number(limit) || 20
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(
    @Query("doctorId") doctorId?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    if (doctorId) {
      return this.bookingService.findByDoctor(doctorId, p, l);
    }
    if (status === "PENDING_REVIEW") {
      return this.bookingService.findPendingReview(p, l);
    }
    if (status) {
      return this.bookingService.findByStatus(status, p, l);
    }
    return this.db.db
      .selectFrom("booking")
      .selectAll()
      .orderBy("created_at", "desc")
      .limit(l)
      .offset((p - 1) * l)
      .execute();
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.bookingService.findOne(id);
  }

  @Post(":id/verify-document-pin")
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  async verifyDocumentPin(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: VerifyDocumentPinDto
  ) {
    return this.bookingService.verifyDocumentPin(id, body.pin);
  }

  @Patch(":id/payment-method")
  async updatePaymentMethod(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdatePaymentMethodDto
  ) {
    return this.bookingService.updatePaymentMethod(id, body.paymentMethod);
  }

  @Get("search/:query")
  @UseGuards(AuthGuard)
  async search(@Param("query") query: string) {
    return this.bookingService.search(query);
  }

  @Get("range/:doctorId")
  @UseGuards(AuthGuard)
  async getByDateRange(
    @Param("doctorId", ParseUUIDPipe) doctorId: string,
    @Query("from") from: string,
    @Query("to") to: string
  ) {
    return this.bookingService.getBookingsByDateRange(doctorId, new Date(from), new Date(to));
  }
}
