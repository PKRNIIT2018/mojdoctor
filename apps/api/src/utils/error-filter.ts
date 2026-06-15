import { Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof Error ? exception.message : "Unknown error";

    this.logger.error(`HTTP ${status}: ${message}`);
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));

    super.catch(exception, host);
  }
}
