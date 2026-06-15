import { Controller, Get, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminService } from "./admin.service";

@Controller("api/admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Get("overview")
  async getOverview() {
    return this.adminService.getOverview();
  }

  @Get("revenue-trend")
  async getRevenueTrend() {
    return this.adminService.getRevenueTrend();
  }

  @Get("booking-trend")
  async getBookingTrend() {
    return this.adminService.getBookingTrend();
  }
}
