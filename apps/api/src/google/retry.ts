import { Logger } from "@nestjs/common";

const logger = new Logger("GoogleRetry");

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 4;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 8000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = (error as { code?: number })?.code;
      if (status !== 429 && status !== 500 && status !== 502 && status !== 503) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        logger.warn(
          `Google API call failed (attempt ${attempt}/${maxAttempts}, status ${status}). Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
