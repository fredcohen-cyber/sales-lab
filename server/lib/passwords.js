import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { MIN_PASSWORD_LENGTH } from '../domain.js';

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 96 * 1024 * 1024;

function scryptAsync(password, salt, n, r, p, keylen) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

// Format: scrypt$N$r$p$saltB64$hashB64
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize('NFKC'), salt, N, R, P, KEYLEN);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, 'base64');
  const key = await scryptAsync(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), Number(n), Number(r), Number(p), expected.length);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Spend comparable time when the account does not exist, so response timing does not reveal accounts.
let dummyHash = null;
export async function burnPasswordCheck(password) {
  if (!dummyHash) dummyHash = await hashPassword('not-a-real-password-' + randomBytes(8).toString('hex'));
  await verifyPassword(password, dummyHash);
  return false;
}

export function passwordProblem(password, email) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) return 'Use 200 characters or fewer.';
  if (email && password.trim().toLowerCase() === String(email).toLowerCase()) {
    return 'Choose a password that is different from your email address.';
  }
  if (/^(.)\1+$/.test(password)) return 'Choose a password that is not a single repeated character.';
  return null;
}
