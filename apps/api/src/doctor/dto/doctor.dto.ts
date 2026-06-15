import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsArray,
  IsUrl,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class NoteTemplateConfigItem {
  @IsString()
  heading!: string;

  @IsString()
  content!: string;
}

export class CreateDoctorDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  licenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  clinicName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clinicAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  practicePhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  licenceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  clinicName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clinicAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  practicePhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteTemplateConfigItem)
  noteTemplateConfig?: NoteTemplateConfigItem[];
}

export class UpdatePracticeSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(240)
  slotLength?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  bufferTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  videoFee?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  inPersonFee?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(720)
  cancellationCutoff?: number;
}

export class UpdateIntegrationSettingsDto {
  @IsOptional()
  @IsString()
  transcriptionProvider?: string;

  @IsOptional()
  @IsString()
  videoProvider?: string;

  @IsOptional()
  @IsString()
  storageProvider?: string;
}

export class UpdateNotificationPrefsDto {
  @IsOptional()
  @IsString()
  dailyAgendaTime?: string;

  @IsOptional()
  @IsBoolean()
  newBookingAlert?: boolean;

  @IsOptional()
  @IsBoolean()
  noShowAlert?: boolean;
}

export class CreateNotificationPrefsDto extends UpdateNotificationPrefsDto {}

export class AcceptDpaDto {
  @IsString()
  @MinLength(1)
  version!: string;
}
