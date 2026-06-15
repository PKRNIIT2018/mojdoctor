import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsArray,
  IsBoolean,
  MinLength,
  MaxLength,
  ArrayMinSize,
} from "class-validator";

export class CreateBookingDto {
  @IsUUID()
  slotId!: string;

  @IsUUID()
  doctorId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  patientName!: string;

  @IsEmail()
  @MaxLength(255)
  patientEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  patientPhone?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gdprConsent?: string;

  @IsOptional()
  @IsString()
  documentPin?: string;
}

export class ApproveBookingDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsString()
  paymentNote?: string;
}

export class ApproveAsAgreedDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsString()
  internalNote?: string;
}

export class PostponeBookingDto {
  @IsUUID()
  bookingId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  alternativeSlotIds!: string[];
}

export class RejectBookingDto {
  @IsUUID()
  bookingId!: string;

  @IsString()
  @MinLength(1)
  reason!: string;
}

export class CancelPatientDto {
  @IsOptional()
  @IsEmail()
  patientEmail?: string;

  @IsOptional()
  @IsBoolean()
  isLate?: boolean;
}

export class PatientRescheduleDto {
  @IsUUID()
  selectedSlotId!: string;

  @IsOptional()
  @IsEmail()
  patientEmail?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class VerifyDocumentPinDto {
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  pin!: string;
}

export class CheckPatientDto {
  @IsEmail()
  email!: string;
}

export class UpdatePaymentMethodDto {
  @IsString()
  paymentMethod!: string;
}
