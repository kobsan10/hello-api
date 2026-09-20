import bcrypt from "bcrypt";
import type { NextRequest } from "next/server";
import { MIN_PASSWORD_LENGTH, requireAdmin } from "@/lib/auth";
import { error, json, preflight, serverError } from "@/lib/http";
import { getUsers, toObjectId } from "@/lib/mongodb";

// PUT /api/users/:id/password — body: { "password": "..." }. Admin only.
export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/users/[id]/password">
) {
  const admin = requireAdmin(request);
  if (admin instanceof Response) return admin;

  const { id } = await ctx.params;
  const _id = toObjectId(id);

  if (!_id) return error("Not a valid user id", 400);

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON", 400);
  }

  const { password } = (body ?? {}) as Record<string, unknown>;

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return error(`\`password\` must be at least ${MIN_PASSWORD_LENGTH} characters`, 400);
  }

  try {
    const users = await getUsers();
    const result = await users.updateOne(
      { _id },
      { $set: { password: await bcrypt.hash(password, 10), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return error("User not found", 404);

    return json({ message: "Password changed" });
  } catch (err) {
    return serverError(err, `PUT /api/users/${id}/password`, "Could not write to the database");
  }
}

export async function OPTIONS() {
  return preflight();
}
