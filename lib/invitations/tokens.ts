import 'server-only';
import { randomBytes, createHash } from 'node:crypto';

/** 32 random bytes -> 43 base64url characters. Only the SHA-256 hash is stored. */
export function generateInvitationToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashInvitationToken(token) };
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** Cheap shape check so garbage never reaches the database. */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}
