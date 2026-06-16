import { Global, Module } from "@nestjs/common";
import { SupabaseService } from "./supabase.service";
import { AuthGuard } from "./auth.guard";
import { OptionalAuthGuard } from "./optional-auth.guard";
import { RolesGuard } from "./roles.guard";

@Global()
@Module({
  providers: [SupabaseService, AuthGuard, OptionalAuthGuard, RolesGuard],
  exports: [SupabaseService, AuthGuard, OptionalAuthGuard, RolesGuard],
})
export class AuthModule {}
