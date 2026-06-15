import { IsString, IsEmail, IsOptional, IsNumber, Min } from "class-validator";

export class AnonymizeDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  olderThanDays?: number;
}

export class ExportDataDto {
  @IsEmail()
  email!: string;
}

export class ErasureDto {
  @IsEmail()
  email!: string;
}
