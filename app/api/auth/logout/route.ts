import { stringifySetCookie } from "cookie";
import { json, preflight } from "@/lib/http";

// GET /api/auth/logout — clears the auth cookie by expiring it immediately.
export async function GET() {
  return json(
    { message: "Logout successful" },
    200,
    {
      "Set-Cookie": stringifySetCookie({
        name: "token",
        value: "",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        secure: process.env.NODE_ENV === "production",
      }),
    }
  );
}

export async function OPTIONS() {
  return preflight();
}
