import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { VideoService } from "../video.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";

const mockCreateVideoRoom = vi.hoisted(() => vi.fn());

vi.mock("@repo/video", () => ({
  createVideoRoom: mockCreateVideoRoom,
}));

function createMockDb() {
  const builder = {
    selectFrom: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn(),
    execute: vi.fn(),
    updateTable: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insertInto: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    executeTakeFirstOrThrow: vi.fn(),
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orWhere: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    deleteFrom: vi.fn().mockReturnThis(),
    whereRef: vi.fn().mockReturnThis(),
  };
  return builder;
}

describe("VideoService", () => {
  let service: VideoService;
  let db: ReturnType<typeof createMockDb>;

  const mockBooking = {
    id: "booking-1",
    slot_id: "slot-1",
    doctor_id: "doc-1",
    patient_name: "John Doe",
    status: "PENDING_REVIEW",
    video_room_url: null,
    created_at: new Date(),
    updated_at: new Date(),
    patient_email: "john@example.com",
    payment_method: "stripe",
    language: "en",
    gdpr_consent: "granted",
    reason: null,
    patient_phone: null,
  };

  const mockSlot = {
    id: "slot-1",
    doctor_id: "doc-1",
    date: new Date("2026-06-10"),
    start_time: "10:00",
    end_time: "10:30",
    mode: "video",
    is_available: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockGoogleService = {
    getAuthClient: vi.fn().mockResolvedValue({}),
    getStatus: vi.fn().mockResolvedValue({ connected: false }),
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    service = new VideoService(
      { db: db as never, onModuleDestroy: vi.fn() } as never,
      mockGoogleService
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createRoomForBooking", () => {
    it("should throw NotFoundException when booking not found", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue(undefined);

      await expect(service.createRoomForBooking("invalid-id")).rejects.toThrow(NotFoundException);
    });

    it("should return existing video_room_url when already set", async () => {
      (db.executeTakeFirst as Mock).mockResolvedValue({
        ...mockBooking,
        video_room_url: "https://room.url",
      });

      const result = await service.createRoomForBooking("booking-1");

      expect(result).toEqual({ roomUrl: "https://room.url", hostRoomUrl: "https://room.url" });
    });

    it("should throw NotFoundException when slot not found", async () => {
      (db.executeTakeFirst as Mock)
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(undefined);

      await expect(service.createRoomForBooking("booking-1")).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when slot mode is not video", async () => {
      (db.executeTakeFirst as Mock)
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce({ ...mockSlot, mode: "in-person" });

      await expect(service.createRoomForBooking("booking-1")).rejects.toThrow(BadRequestException);
    });

    it("should create a room and update the booking on success", async () => {
      (db.executeTakeFirst as Mock)
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(mockSlot);

      mockCreateVideoRoom.mockResolvedValue({
        roomUrl: "https://room.url",
        hostRoomUrl: "https://room.host.url",
        roomName: "consult-booking-1",
      });

      const result = await service.createRoomForBooking("booking-1");

      expect(mockCreateVideoRoom).toHaveBeenCalledWith({
        roomNamePrefix: "consult-booking-",
        endDate: expect.any(Date),
        auth: {},
      });
      expect(db.updateTable as Mock).toHaveBeenCalledWith("booking");
      expect(result).toEqual({
        roomUrl: "https://room.url",
        hostRoomUrl: "https://room.host.url",
      });
    });
  });
});
