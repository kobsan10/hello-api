import { stringifySetCookie } from "cookie";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { error } from "@/lib/http";

const JWT_SECRET = process.env.JWT_SECRET;

// The env-configured admin is not a database user, so it gets a reserved id.
export const ADMIN_ID = "-1";

export const MIN_PASSWORD_LENGTH = 6;

export type JwtPayload = {
  id: string;
  email: string;
  username: string;
};

export function verifyJWT(request: NextRequest): JwtPayload | null {
  const token = request.cookies.get("token")?.value;

  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (err) {
    console.error("verifyJWT failed:", err);
    return null;
  }
}

// Admin is decided from the signed token only — never from a request header,
// which any client could set.
export function isAdmin(user: JwtPayload): boolean {
  return user.id === ADMIN_ID;
}

/** The verified user, or a ready-to-return 401 response. */
export function requireUser(request: NextRequest): JwtPayload | Response {
  return verifyJWT(request) ?? error("Unauthorized Request", 401);
}

/** The verified admin, or a ready-to-return 401/403 response. */
export function requireAdmin(request: NextRequest): JwtPayload | Response {
  const user = requireUser(request);
  if (user instanceof Response) return user;
  return isAdmin(user) ? user : error("Admin access required", 403);
}

// Login and logout must use identical attributes, or the browser won't treat the
// logout cookie as the same one and the session survives.
export function authCookie(value: string, maxAge: number): string {
  return stringifySetCookie({
    name: "token",
    value,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  });
}
