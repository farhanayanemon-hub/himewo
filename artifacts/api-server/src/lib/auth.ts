import { type Request, type Response, type NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import { env } from "./env";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

let jwks: JWTVerifyGetKey | null = null;
function getJwks(): JWTVerifyGetKey | null {
  if (!env.supabaseUrl) return null;
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${env.supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }
  return jwks;
}

/**
 * Resolve a bearer token to a user id (Supabase auth uid).
 * - Production: verifies the Supabase JWT (HS256 secret or asymmetric JWKS).
 * - Development: also accepts `dev:<uuid>` tokens for testing.
 */
export async function resolveUserId(token: string): Promise<string | null> {
  if (!env.isProduction && token.startsWith("dev:")) {
    const id = token.slice(4).trim();
    return id || null;
  }
  try {
    if (env.supabaseJwtSecret) {
      const secret = new TextEncoder().encode(env.supabaseJwtSecret);
      const { payload } = await jwtVerify(token, secret);
      return typeof payload.sub === "string" ? payload.sub : null;
    }
    const keyFn = getJwks();
    if (keyFn) {
      const { payload } = await jwtVerify(token, keyFn);
      return typeof payload.sub === "string" ? payload.sub : null;
    }
  } catch {
    return null;
  }
  return null;
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
