import { IsString, IsOptional, IsUUID, IsArray, ValidateNested, MinLength } from "class-validator";
import { Type } from "class-transformer";

class NoteSectionDto {
  @IsString()
  heading!: string;

  @IsString()
  content!: string;
}

export class CreateNoteDto {
  @IsUUID()
  caseFileId!: string;

  @IsOptional()
  @IsString()
  contentMarkdown?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteSectionDto)
  sections?: NoteSectionDto[];

  @IsOptional()
  @IsString()
  summary?: string;
}

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  contentMarkdown?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteSectionDto)
  sections?: NoteSectionDto[];

  @IsOptional()
  @IsString()
  summary?: string;
}

export class AddPrescriptionDto {
  @IsString()
  @MinLength(1)
  medicationName!: string;

  @IsString()
  @MinLength(1)
  dosage!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  validUntil?: string;
}
