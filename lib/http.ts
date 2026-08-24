import { ConfigError } from "@/lib/mongodb";

// The React frontend calls this API from a different origin, so every response
// carries CORS headers — same reason /api/hello does.
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
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
