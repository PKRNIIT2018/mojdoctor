import { IsString, IsUUID, IsOptional, IsNumber, Min, Max } from "class-validator";

export class CreateSetupIntentDto {
  @IsUUID()
  bookingId!: string;
}

export class ConfirmSetupIntentDto {
  @IsUUID()
  bookingId!: string;

  @IsString()
  setupIntentId!: string;

  @IsString()
  paymentMethodId!: string;
}

export class RetryPaymentDto {
  @IsUUID()
  bookingId!: string;
}

export class CreatePaymentDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class RefundPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;
}
