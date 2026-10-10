import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt from node:crypto instead of bcrypt/argon2: no native build step,
// which keeps `npm install` and CI fast and dependency-light.
const scrypt = promisify(scryptCb);

const KEY_LENGTH = 64;

function split(stored: string): { salt: string; hash: string } {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) throw new Error("Malformed password hash");
  return { salt, hash };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const { salt, hash } = split(stored);
    const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    const expected = Buffer.from(hash, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}