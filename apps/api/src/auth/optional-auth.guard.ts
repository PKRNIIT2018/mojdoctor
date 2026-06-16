import { Injectable, CanActivate, ExecutionContext, Inject } from "@nestjs/common";
import { SupabaseService } from "./supabase.service";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(@Inject(SupabaseService) private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader?.startsWith("Bearer ")) {
      request.user = null;
      return true;
    }

    const token = authHeader.slice(7);
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      request.user = null;
      return true;
    }

    request.user = data.user;
    return true;
  }
}
