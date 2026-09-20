import { authCookie } from "@/lib/auth";
import { json, preflight } from "@/lib/http";

// GET /api/auth/logout — clears the auth cookie by expiring it immediately.
export async function GET() {
  return json({ message: "Logout successful" }, 200, {
    "Set-Cookie": authCookie("", 0),
  });
}

export async function OPTIONS() {
  return preflight();
}
