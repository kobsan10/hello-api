import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { X_HEADER_USER_ID } from "@/lib/constants";

const JWT_SECRET = process.env.JWT_SECRET;

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

export function isAdmin(request: NextRequest): boolean {
  const userId = Number(request.headers.get(X_HEADER_USER_ID));
  return userId === -1;
}
