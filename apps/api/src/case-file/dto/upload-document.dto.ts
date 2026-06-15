import { IsOptional, IsString, MaxLength } from "class-validator";

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}
