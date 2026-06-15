import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createKyselyClient } from "@repo/db";
import type { Database } from "@repo/db";
import { Kysely } from "kysely";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  public readonly db: Kysely<Database>;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    this.db = createKyselyClient(databaseUrl);
  }

  async onModuleDestroy() {
    await this.db.destroy();
  }
}
