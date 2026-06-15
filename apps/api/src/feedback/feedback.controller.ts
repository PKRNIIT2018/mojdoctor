import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Inject,
  ParseUUIDPipe,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "../auth/auth.guard";
import { FeedbackService } from "./feedback.service";
import { CreateFeedbackDto } from "./dto/feedback.dto";

@Controller("api/feedback")
export class FeedbackController {
  constructor(@Inject(FeedbackService) private readonly feedbackService: FeedbackService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } })
  async create(@Body() body: CreateFeedbackDto) {
    return this.feedbackService.create(body);
  }

  @Get("booking/:bookingId")
  async findByBooking(@Param("bookingId", ParseUUIDPipe) bookingId: string) {
    return this.feedbackService.findByBooking(bookingId);
  }

  @Get("doctor/:doctorId/stats")
  @UseGuards(AuthGuard)
  async getDoctorStats(@Param("doctorId", ParseUUIDPipe) doctorId: string) {
    return this.feedbackService.getStats(doctorId);
  }

  @Get("doctor/:doctorId")
  @UseGuards(AuthGuard)
  async findByDoctor(@Param("doctorId", ParseUUIDPipe) doctorId: string) {
    return this.feedbackService.findByDoctor(doctorId);
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.feedbackService.findOne(id);
  }
}
