import { Injectable, NotFoundException, BadRequestException, Inject } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { GoogleService } from "../google/google.service";
import { createVideoRoom } from "@repo/video";

@Injectable()
export class VideoService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(GoogleService) private readonly googleService: GoogleService
  ) {}

  async createRoomForBooking(bookingId: string) {
    const booking = await this.database.db
      .selectFrom("booking")
      .selectAll()
      .where("id", "=", bookingId)
      .executeTakeFirst();

    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.video_room_url) {
      return { roomUrl: booking.video_room_url, hostRoomUrl: booking.video_room_url };
    }

    const slot = await this.database.db
      .selectFrom("slot")
      .selectAll()
      .where("id", "=", booking.slot_id)
      .executeTakeFirst();

    if (!slot) throw new NotFoundException("Slot not found");
    if (slot.mode !== "video") throw new BadRequestException("Booking is not a video consultation");

    const endDate = new Date(`${slot.date.toISOString().split("T")[0]}T${slot.end_time}`);
    endDate.setHours(endDate.getHours() + 1);

    const auth = await this.googleService.getAuthClient(slot.doctor_id);

    const room = await createVideoRoom({
      roomNamePrefix: `consult-${bookingId.slice(0, 8)}`,
      endDate,
      auth,
    });

    await this.database.db
      .updateTable("booking")
      .set({ video_room_url: room.roomUrl, updated_at: new Date() })
      .where("id", "=", bookingId)
      .execute();

    return { roomUrl: room.roomUrl, hostRoomUrl: room.hostRoomUrl };
  }
}
