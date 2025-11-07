import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keyLength: 64
};

const scrypt = promisify(scryptCallback);

const formatDigest = ({ salt, key, N, r, p }) => `scrypt$${N}$${r}$${p}$${salt}$${key.toString('hex')}`;

const deriveKey = async ({ password, salt, keyLength, N, r, p }) => {
  const derived = await scrypt(password, salt, keyLength, { N, r, p });
  return derived;
};

const deriveKeySync = ({ password, salt, keyLength, N, r, p }) => {
  return scryptSync(password, salt, keyLength, { N, r, p });
};

const parseDigest = (digest) => {
  if (typeof digest !== 'string') {
    return null;
  }

  const parts = digest.split('$');
  const [tag, rawN, rawR, rawP, salt, keyHex] = parts;
  if (parts.length !== 6 || tag !== 'scrypt') {
    return null;
  }

  const N = Number.parseInt(rawN, 10);
  const r = Number.parseInt(rawR, 10);
  const p = Number.parseInt(rawP, 10);

  if (!salt || !keyHex || Number.isNaN(N) || Number.isNaN(r) || Number.isNaN(p)) {
    return null;
  }

  return {
    N,
    r,
    p,
    salt,
    key: Buffer.from(keyHex, 'hex')
  };
};

export const hashPassword = async (password) => {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }

  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey({
    password,
    salt,
    keyLength: SCRYPT_PARAMS.keyLength,
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  });

  return formatDigest({ salt, key, ...SCRYPT_PARAMS });
};

export const hashPasswordSync = (password) => {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string');
  }

  const salt = randomBytes(16).toString('hex');
  const key = deriveKeySync({
    password,
    salt,
    keyLength: SCRYPT_PARAMS.keyLength,
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  });

  return formatDigest({ salt, key, ...SCRYPT_PARAMS });
};

export const verifyPassword = async (password, digest) => {
  const parsed = parseDigest(digest);
  if (!parsed) {
    return false;
  }

  try {
    const candidateKey = await deriveKey({
      password,
      salt: parsed.salt,
      keyLength: parsed.key.length,
      N: parsed.N,
      r: parsed.r,
      p: parsed.p
    });

    if (candidateKey.length !== parsed.key.length) {
      return false;
    }

    return timingSafeEqual(candidateKey, parsed.key);
  } catch (err) {
    return false;
  }
};

export const needsRehash = (digest) => {
  const parsed = parseDigest(digest);
  if (!parsed) {
    return true;
  }

  return parsed.N !== SCRYPT_PARAMS.N || parsed.r !== SCRYPT_PARAMS.r || parsed.p !== SCRYPT_PARAMS.p;
};

export const scryptDigestTag = 'scrypt';
