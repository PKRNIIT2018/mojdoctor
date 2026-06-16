import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from "@nestjs/common";
import { Observable, from } from "rxjs";
import { tap, switchMap } from "rxjs/operators";
import { DoctorService } from "../doctor/doctor.service";

@Injectable()
export class ResolveDoctorInterceptor implements NestInterceptor {
  constructor(@Inject(DoctorService) private readonly doctorService: DoctorService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!request.user?.email) {
      return next.handle();
    }
    return from(this.doctorService.findByEmail(request.user.email)).pipe(
      tap((doctor: any) => {
        request.doctor = doctor ?? null;
      }),
      switchMap(() => next.handle())
    );
  }
}
