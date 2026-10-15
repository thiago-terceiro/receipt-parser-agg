import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const KEY_LEN = 64;

export const hashPassword = async (password: string): Promise<string> => {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string.");
  }
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LEN)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
};

export const verifyPassword = async (
  password: string,
  storedHash: string,
): Promise<boolean> => {
  if (!password || typeof password !== "string") {
    return false;
  }
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, expectedHashHex] = parts;
  if (!salt || !expectedHashHex) {
    return false;
  }

  try {
    const derivedKey = (await scrypt(password, salt, KEY_LEN)) as Buffer;
    const expectedKey = Buffer.from(expectedHashHex, "hex");
    if (derivedKey.length !== expectedKey.length) {
      return false;
    }
    return timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
};
