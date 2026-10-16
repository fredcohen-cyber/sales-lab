import { createHash, randomBytes } from 'node:crypto';

export function newToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export function looksLikeToken(token) {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{32,64}$/.test(token);
}
