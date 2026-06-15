import { randomBytes, createHash, createCipheriv, createDecipheriv, pbkdf2Sync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const DIGEST = "sha256";

function deriveKey(pin: string, salt: Buffer): Buffer {
  return pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST);
}

export function encryptPdfWithPin(pdfBuffer: Buffer, pin: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(pin, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(pdfBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return combined.toString("base64");
}

export function decryptPdfWithPin(encryptedBase64: string, pin: string): Buffer {
  const combined = Buffer.from(encryptedBase64, "base64");

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(pin, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}
