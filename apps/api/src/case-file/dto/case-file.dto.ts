import { IsString, IsEmail, IsOptional, IsNumber, IsUUID, Min, MaxLength } from "class-validator";

export class CreateCaseFileDto {
  @IsUUID()
  bookingId!: string;

  @IsUUID()
  doctorId!: string;

  @IsString()
  patientName!: string;

  @IsEmail()
  patientEmail!: string;
}

export class AddDocumentDto {
  @IsString()
  fileName!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  r2Key?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
