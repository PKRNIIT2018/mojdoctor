import { Controller, Post, Body, UseGuards, Inject } from "@nestjs/common";
import { VideoService } from "./video.service";
import { AuthGuard } from "../auth/auth.guard";
import { CreateVideoRoomDto } from "./dto/video.dto";

@Controller("api/video")
@UseGuards(AuthGuard)
export class VideoController {
  constructor(@Inject(VideoService) private readonly videoService: VideoService) {}

  @Post("rooms")
  async createRoom(@Body() body: CreateVideoRoomDto) {
    return this.videoService.createRoomForBooking(body.bookingId);
  }
}
