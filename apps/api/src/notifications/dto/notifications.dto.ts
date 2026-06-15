import { IsString, IsEmail, IsOptional, IsBoolean, MaxLength, MinLength } from "class-validator";

export class CreateTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  bodyMarkdown?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  event?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  bodyMarkdown?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  event?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class SendNotificationDto {
  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsEmail()
  to!: string;

  @IsString()
  @MinLength(1)
  subject!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  bookingId?: string;
}

export class SendPatientNotificationDto {
  @IsEmail()
  patientEmail!: string;

  @IsString()
  @MinLength(1)
  patientName!: string;
}
