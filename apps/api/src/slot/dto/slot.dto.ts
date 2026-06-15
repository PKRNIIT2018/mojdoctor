import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsObject,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class DateRangeDto {
  @IsString()
  from!: string;

  @IsString()
  to!: string;
}

export class CreateRuleDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  slotDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  breakBetween?: number;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;
}

export class UpdateRuleDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(5)
  slotDuration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  breakBetween?: number;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateOverrideDto {
  @IsString()
  date!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
