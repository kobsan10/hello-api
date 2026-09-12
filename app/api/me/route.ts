import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { error, json, preflight } from "@/lib/http";

// GET /api/me — "who am I": returns the logged-in user's brief profile, or 401.
// Lets the frontend detect an existing httpOnly session cookie at startup.
export async function GET(request: NextRequest) {
  const user = verifyJWT(request);

  if (!user) return error("Unauthorized Request", 401);

  return json({ user });
}

export async function OPTIONS() {
  return preflight();
}
