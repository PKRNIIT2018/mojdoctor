import { IsUUID } from "class-validator";

export class CreateVideoRoomDto {
  @IsUUID()
  bookingId!: string;
}
