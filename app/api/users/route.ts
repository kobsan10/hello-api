import bcrypt from "bcrypt";
import type { NextRequest } from "next/server";
import { MIN_PASSWORD_LENGTH, requireAdmin } from "@/lib/auth";
import { error, json, preflight, serverError } from "@/lib/http";
import { getUsers, type User } from "@/lib/mongodb";

// GET /api/users — list users (never their password hashes). Admin only.
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;

  try {
    const users = await getUsers();
    const documents = await users
      .find({}, { projection: { password: 0 } })
      .sort({ email: 1 })
      .toArray();

    return json(documents);
  } catch (err) {
    return serverError(err, "GET /api/users", "Could not read from the database");
  }
}

// POST /api/users — body: { "email", "username", "password" }. Admin only.
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON", 400);
  }

  const { email, username, password } = (body ?? {}) as Record<string, unknown>;

  if (typeof email !== "string" || email.trim() === "") {
    return error("`email` is required and must be a non-empty string", 400);
  }

  if (typeof username !== "string" || username.trim() === "") {
    return error("`username` is required and must be a non-empty string", 400);
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return error(`\`password\` must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }

  const cleanEmail = email.trim();

  // The env admin logs in with ADMIN_USER before the users collection is checked,
  // so a database user with the same login could never sign in.
  if (cleanEmail === process.env.ADMIN_USER) {
    return error("That login is reserved for the admin", 409);
  }

  try {
    const users = await getUsers();

    if (await users.findOne({ email: cleanEmail })) {
      return error("A user with that email already exists", 409);
    }

    const now = new Date();
    const user: User = {
      email: cleanEmail,
      username: username.trim(),
      password: await bcrypt.hash(password, 10),
      createdAt: now,
      updatedAt: now,
    };

    const result = await users.insertOne(user);

    return json(
      { _id: result.insertedId, email: user.email, username: user.username, createdAt: now },
      201
    );
  } catch (err) {
    return serverError(err, "POST /api/users", "Could not write to the database");
  }
}

export async function OPTIONS() {
  return preflight();
}
