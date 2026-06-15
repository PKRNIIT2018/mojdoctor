import { IsString, IsOptional, IsNumber, IsUUID, Min, Max } from "class-validator";

export class CreateFeedbackDto {
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
