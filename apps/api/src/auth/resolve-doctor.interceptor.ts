import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from "@nestjs/common";
import { Observable, from } from "rxjs";
import { tap, switchMap } from "rxjs/operators";
import { DatabaseService } from "../database/database.service";

// ponytail: use DatabaseService (global) instead of DoctorService to avoid
// circular imports in every module that uses this interceptor.
@Injectable()
export class ResolveDoctorInterceptor implements NestInterceptor {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!request.user?.email) {
      return next.handle();
    }
    const query = this.database.db
      .selectFrom("doctor")
      .selectAll()
      .where("email", "=", request.user.email as string)
      .executeTakeFirst();
    return from(query).pipe(
      tap((doctor: any) => {
        request.doctor = doctor ?? null;
      }),
      switchMap(() => next.handle())
    );
  }
}
