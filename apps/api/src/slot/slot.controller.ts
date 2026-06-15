import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard } from "../auth/auth.guard";
import { DatabaseService } from "../database/database.service";
import { SlotService } from "./slot.service";
import { CreateRuleDto, UpdateRuleDto, CreateOverrideDto } from "./dto/slot.dto";

@Controller("api/slots")
export class SlotController {
  constructor(
    @Inject(SlotService) private readonly slotService: SlotService,
    @Inject(DatabaseService) private readonly db: DatabaseService
  ) {}

  @Get("available/:doctorId")
  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } })
  async findAvailable(
    @Param("doctorId", ParseUUIDPipe) doctorId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("mode") mode?: string
  ) {
    return this.slotService.findAvailable(doctorId, from, to);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findByDoctor(@Query("doctorId") doctorId: string, @Query("date") date?: string) {
    return this.slotService.findByDoctor(doctorId, date);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.db.db.selectFrom("slot").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
  }

  @Get("rules/:doctorId")
  @UseGuards(AuthGuard)
  async getRules(@Param("doctorId", ParseUUIDPipe) doctorId: string) {
    return this.slotService.getRules(doctorId);
  }

  @Post("rules")
  @UseGuards(AuthGuard)
  async createRule(@Query("doctorId") doctorId: string, @Body() body: CreateRuleDto) {
    const rule = await this.slotService.createRule(doctorId, body);
    await this.slotService.generateSlots(doctorId);
    return rule;
  }

  @Put("rules/:ruleId")
  @UseGuards(AuthGuard)
  async updateRule(@Param("ruleId", ParseUUIDPipe) ruleId: string, @Body() body: UpdateRuleDto) {
    const rule = await this.slotService.updateRule(ruleId, body);
    return rule;
  }

  @Delete("rules/:ruleId")
  @UseGuards(AuthGuard)
  async deleteRule(@Param("ruleId", ParseUUIDPipe) ruleId: string) {
    const rule = await this.slotService.deleteRule(ruleId);
    return rule;
  }

  @Get("overrides/:doctorId")
  @UseGuards(AuthGuard)
  async getOverrides(
    @Param("doctorId", ParseUUIDPipe) doctorId: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.slotService.getOverrides(doctorId, from, to);
  }

  @Post("overrides")
  @UseGuards(AuthGuard)
  async createOverride(@Query("doctorId") doctorId: string, @Body() body: CreateOverrideDto) {
    const override = await this.slotService.createOverride(doctorId, body);
    await this.slotService.generateSlots(doctorId);
    return override;
  }

  @Delete("overrides/:overrideId")
  @UseGuards(AuthGuard)
  async deleteOverride(@Param("overrideId", ParseUUIDPipe) overrideId: string) {
    const override = await this.slotService.deleteOverride(overrideId);
    return override;
  }

  @Post("generate/:doctorId")
  @UseGuards(AuthGuard)
  async generateSlots(@Param("doctorId", ParseUUIDPipe) doctorId: string) {
    const result = await this.slotService.generateSlots(doctorId);
    return result;
  }
}
