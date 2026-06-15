import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  ValidateNested,
  MinLength,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

class QuestionDto {
  @IsString()
  label!: string;

  @IsString()
  type!: string;

  @IsBoolean()
  required!: boolean;
}

export class CreateIntakeTemplateDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions!: QuestionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateIntakeTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SubmitIntakeResponseDto {
  @IsUUID()
  bookingId!: string;

  @IsObject()
  responses!: Record<string, unknown>;
}
