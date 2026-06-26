import { type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import { env } from "./env";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function b64urlToBuffer(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function b64urlToJson<T = Record<string, unknown>>(input: string): T {
  return JSON.parse(b64urlToBuffer(input).toString("utf8")) as T;
}

type Jwk = crypto.JsonWebKey & { kid?: string };

let jwksCache: Jwk[] | null = null;
let jwksFetchedAt = 0;
const JWKS_TTL_MS = 10 * 60 * 1000;

async function getJwksKeys(): Promise<Jwk[] | null> {
  if (!env.supabaseUrl) return null;
  const now = Date.now();
  if (jwksCache && now - jwksFetchedAt < JWKS_TTL_MS) return jwksCache;
  const res = await fetch(
    `${env.supabaseUrl}/auth/v1/.well-known/jwks.json`,
  );
  if (!res.ok) return jwksCache;
  const data = (await res.json()) as { keys: Jwk[] };
  jwksCache = data.keys;
  jwksFetchedAt = now;
  return data.keys;
}

function verifyAsymmetric(
  alg: string,
  signingInput: string,
  signature: Buffer,
  jwk: Jwk,
): boolean {
  const keyObject = crypto.createPublicKey({ format: "jwk", key: jwk });
  const data = Buffer.from(signingInput);
  if (alg === "ES256") {
    return crypto.verify(
      "sha256",
      data,
      { key: keyObject, dsaEncoding: "ieee-p1363" },
      signature,
    );
  }
  if (alg === "RS256") {
    return crypto.verify("RSA-SHA256", data, keyObject, signature);
  }
  return false;
}

/**
 * Resolve a bearer token to a user id (Supabase auth uid).
 * - Production: verifies the Supabase JWT using node:crypto.
 *   - HS256 via the shared secret (legacy projects).
 *   - ES256 / RS256 via the project's published JWKS (asymmetric keys).
 * - Development: also accepts `dev:<uuid>` tokens for testing.
 *
 * Implemented with node:crypto (instead of a third-party JWT library) so that
 * verification is not affected by how the server bundle is built.
 */
export async function resolveUserId(token: string): Promise<string | null> {
  if (!env.isProduction && token.startsWith("dev:")) {
    const id = token.slice(4).trim();
    return id || null;
  }
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const header = b64urlToJson<{ alg?: string; kid?: string }>(headerB64);
    const payload = b64urlToJson<{
      sub?: unknown;
      exp?: number;
      nbf?: number;
    }>(payloadB64);
    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = b64urlToBuffer(signatureB64);

    const nowSec = Math.floor(Date.now() / 1000);
    const skew = 60;
    if (typeof payload.exp === "number" && nowSec > payload.exp + skew) {
      return null;
    }
    if (typeof payload.nbf === "number" && nowSec + skew < payload.nbf) {
      return null;
    }

    let valid = false;
    if (header.alg === "HS256") {
      if (!env.supabaseJwtSecret) return null;
      const expected = crypto
        .createHmac("sha256", env.supabaseJwtSecret)
        .update(signingInput)
        .digest();
      valid =
        expected.length === signature.length &&
        crypto.timingSafeEqual(expected, signature);
    } else if (header.alg === "ES256" || header.alg === "RS256") {
      const keys = await getJwksKeys();
      if (!keys || keys.length === 0) return null;
      const jwk =
        keys.find((k) => !header.kid || k.kid === header.kid) ?? keys[0];
      if (!jwk) return null;
      valid = verifyAsymmetric(header.alg, signingInput, signature, jwk);
    } else {
      return null;
    }

    if (!valid) return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch (err) {
    console.error(
      "resolveUserId error:",
      (err as Error)?.message,
      "supabaseUrlSet=",
      Boolean(env.supabaseUrl),
    );
    return null;
  }
}

export function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7).trim();
  if (!env.isProduction) {
    const devUser = req.headers["x-dev-user-id"];
    if (typeof devUser === "string" && devUser) return `dev:${devUser}`;
    if (env.devUserId) return `dev:${env.devUserId}`;
  }
  return null;
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (token) {
    const userId = await resolveUserId(token);
    if (userId) req.userId = userId;
  }
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
