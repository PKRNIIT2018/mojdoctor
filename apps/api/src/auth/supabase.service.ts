import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;

  onModuleInit() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      this.logger.warn(
        "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — Supabase client disabled"
      );
      return;
    }
    this.client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error("Supabase client not initialized — check env vars");
    }
    return this.client;
  }
}
