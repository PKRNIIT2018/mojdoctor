import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Headers,
  Req,
  RawBodyRequest,
  Inject,
  BadRequestException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { PaymentService } from "./payment.service";
import { DatabaseService } from "../database/database.service";
import { getStripe } from "@repo/shared";
import {
  CreateSetupIntentDto,
  ConfirmSetupIntentDto,
  RetryPaymentDto,
  CreatePaymentDto,
  RefundPaymentDto,
} from "./dto/payment.dto";
import type { Request } from "express";
import type { User } from "@supabase/supabase-js";

@Controller("api/payments")
export class PaymentController {
  constructor(
    @Inject(PaymentService) private readonly paymentService: PaymentService,
    @Inject(DatabaseService) private readonly database: DatabaseService
  ) {}

  @Post("setup-intent")
  async createSetupIntent(@Body() body: CreateSetupIntentDto) {
    return this.paymentService.createSetupIntent(body.bookingId);
  }

  @Post("confirm-setup")
  async confirmSetupIntent(@Body() body: ConfirmSetupIntentDto) {
    return this.paymentService.confirmSetupIntent(
      body.bookingId,
      body.setupIntentId,
      body.paymentMethodId
    );
  }

  @Post("retry")
  async retryPayment(@Body() body: RetryPaymentDto) {
    return this.paymentService.retryPayment(body.bookingId);
  }

  @SkipThrottle()
  @Post("webhook")
  async handleWebhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    const stripe = getStripe();
    const raw = req.rawBody;
    if (!raw) {
      throw new BadRequestException("Missing raw body");
    }

    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
      event = stripe.webhooks.constructEvent(
        raw as unknown as string | Buffer,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid signature";
      throw new BadRequestException(`Webhook signature verification failed: ${message}`);
    }

    await this.paymentService.processStripeWebhook(event);
    return { received: true };
  }

  @Get("booking/:bookingId")
  @UseGuards(AuthGuard)
  async findByBooking(@Param("bookingId", ParseUUIDPipe) bookingId: string) {
    return this.paymentService.findByBooking(bookingId);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Body() body: CreatePaymentDto) {
    return this.paymentService.createPayment(body);
  }

  @Post(":paymentId/capture")
  @UseGuards(AuthGuard)
  async capture(@CurrentUser() user: User, @Param("paymentId", ParseUUIDPipe) paymentId: string) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select("id")
      .where("email", "=", user.email!)
      .executeTakeFirst();
    return this.paymentService.capturePayment(paymentId, doctor!.id);
  }

  @Post(":paymentId/refund")
  @UseGuards(AuthGuard)
  async refund(
    @CurrentUser() user: User,
    @Param("paymentId", ParseUUIDPipe) paymentId: string,
    @Body() body: RefundPaymentDto
  ) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select("id")
      .where("email", "=", user.email!)
      .executeTakeFirst();
    return this.paymentService.refundPayment(paymentId, body.amount, doctor!.id);
  }

  @Post(":paymentId/void")
  @UseGuards(AuthGuard)
  async void(@CurrentUser() user: User, @Param("paymentId", ParseUUIDPipe) paymentId: string) {
    const doctor = await this.database.db
      .selectFrom("doctor")
      .select("id")
      .where("email", "=", user.email!)
      .executeTakeFirst();
    return this.paymentService.voidPayment(paymentId, doctor!.id);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.paymentService.findByBooking(id);
  }
}
