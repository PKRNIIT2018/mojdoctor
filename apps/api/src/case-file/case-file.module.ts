import { Module } from "@nestjs/common";
import { CaseFileController } from "./case-file.controller";
import { CaseFileService } from "./case-file.service";
import { GoogleModule } from "../google/google.module";

@Module({
  imports: [GoogleModule],
  controllers: [CaseFileController],
  providers: [CaseFileService],
  exports: [CaseFileService],
})
export class CaseFileModule {}
