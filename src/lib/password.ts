import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Password hashing for self-host mode. scrypt comes from node:crypto: it is
// memory-hard like argon2, but needs no per-architecture native binary, so the
// multi-arch Docker image stays a plain Node image.
//
// The stored string carries its own parameters, so raising the cost later only
// affects new passwords — existing hashes keep verifying.

type ScryptParams = { N: number; r: number; p: number; maxmem: number };

// ~32 MB per hash at N=2^15. maxmem must exceed 128 * N * r.
const PARAMS: ScryptParams = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function derive(
  password: string,
  salt: Buffer,
  keyLength: number,
  params: ScryptParams,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, params, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

// Node's base64 decoder silently drops trailing junk, so `hash + "x"` would
// still decode to the real key. Require a round-trip to reject tampered hashes.
function decodeExact(value: string): Buffer | null {
  const bytes = Buffer.from(value, "base64");
  return bytes.length > 0 && bytes.toString("base64") === value ? bytes : null;
}

/** A fresh hash. Format: scrypt$N$r$p$salt$key, all base64. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, KEY_LENGTH, PARAMS);
  const { N, r, p } = PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/**
 * Whether `password` produced `stored`. Returns false for a malformed or empty
 * hash instead of throwing, so a user row without a password (a cloud account
 * migrated to self-host) simply cannot log in.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const salt = decodeExact(parts[4]);
  const expected = decodeExact(parts[5]);
  if (!salt || !expected) return false;

  const key = await derive(password, salt, expected.length, {
    N,
    r,
    p,
    maxmem: 128 * N * r * 2,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}
