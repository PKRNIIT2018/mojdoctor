import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerBehindProxyGuard } from "./throttler-behind-proxy.guard";

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class ThrottlerAppModule {}
