import { ConfigError } from "@/lib/mongodb";

// The React frontend calls this API from a different origin, so every response
// carries CORS headers. The origin can no longer be "*" now that auth uses an
// httpOnly cookie: browsers refuse credentialed cross-origin requests unless the
// server names the exact origin and sets Allow-Credentials. Update the origin below
// if the frontend's dev server or deployed URL changes.
export const CORS_HEADERS = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, { status, headers: { ...CORS_HEADERS, ...headers } });
}

export function error(message: string, status: number) {
  return json({ error: message }, status);
}

/**
 * Turns a thrown database error into a 500. A misconfigured `.env.local` is the most
 * likely cause, so that message is passed through instead of a generic one — otherwise
 * it would only ever show up in the terminal.
 */
export function serverError(err: unknown, where: string, fallback: string) {
  console.error(`${where} failed:`, err);

  if (err instanceof ConfigError) {
    return error(err.message, 500);
  }

  return error(fallback, 500);
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
