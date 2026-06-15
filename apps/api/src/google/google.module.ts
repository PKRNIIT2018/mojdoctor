import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GoogleController } from "./google.controller";
import { GoogleCalendarService } from "./google-calendar.service";
import { GoogleDriveService } from "./google-drive.service";
import { GoogleGmailService } from "./google-gmail.service";
import { GoogleService } from "./google.service";

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [GoogleController],
  providers: [GoogleService, GoogleCalendarService, GoogleGmailService, GoogleDriveService],
  exports: [GoogleService, GoogleCalendarService, GoogleGmailService, GoogleDriveService],
})
export class GoogleModule {}
