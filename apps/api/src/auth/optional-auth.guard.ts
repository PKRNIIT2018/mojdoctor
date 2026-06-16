import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader?.startsWith("Bearer ")) {
      request.user = null;
      return true;
    }

    const token = authHeader.slice(7);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      request.user = null;
      return true;
    }

    request.user = data.user;
    return true;
  }
}
