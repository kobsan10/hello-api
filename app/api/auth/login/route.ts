import bcrypt from "bcrypt";
import { stringifySetCookie } from "cookie";
import jwt from "jsonwebtoken";
import { ConfigError, getUsers } from "@/lib/mongodb";
import { error, json, preflight, serverError } from "@/lib/http";

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

type AuthUser = {
  _id: string;
  email: string;
  username: string;
};

// POST /api/auth/login — body: { "email": "...", "password": "..." }
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON", 400);
  }

  const { email, password } = (body ?? {}) as Record<string, unknown>;

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return error("Missing email or password", 400);
  }

  try {
    // The admin credentials come from env vars, not the users collection, so
    // that check runs first and never touches the database.
    const user = checkAdmin(email, password) ?? (await checkUser(email, password));

    if (!user) return error("Invalid email or password", 401);

    const token = getJwtToken(user);

    return json(
      { message: "Login successful", user },
      200,
      {
        "Set-Cookie": stringifySetCookie({
          name: "token",
          value: token,
          httpOnly: true,
          sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          secure: process.env.NODE_ENV === "production",
        }),
      }
    );
  } catch (err) {
    return serverError(err, "POST /api/auth/login", "Could not log in");
  }
}

function checkAdmin(email: string, password: string): AuthUser | null {
  if (!ADMIN_USER || !ADMIN_PASS) return null;
  if (ADMIN_USER === email && ADMIN_PASS === password) {
    return { _id: "-1", email, username: "admin" };
  }
  return null;
}

async function checkUser(email: string, password: string): Promise<AuthUser | null> {
  const users = await getUsers();
  const user = await users.findOne({ email });

  if (!user) return null;

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) return null;

  return { _id: String(user._id), email: user.email, username: user.username };
}

function getJwtToken(user: AuthUser): string {
  if (!JWT_SECRET) {
    throw new ConfigError(
      "JWT_SECRET is not set. Add it to .env.local and restart the dev server."
    );
  }

  return jwt.sign(
    { id: user._id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function OPTIONS() {
  return preflight();
}
