import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { error, json, preflight, serverError } from "@/lib/http";
import { getItems, toObjectId } from "@/lib/mongodb";

// Every handler below requires a valid session and writes an audit entry.

// GET /api/item/:id — read one item.
export async function GET(request: NextRequest, ctx: RouteContext<"/api/item/[id]">) {
  const user = requireUser(request);
  if (user instanceof Response) return user;

  const { id } = await ctx.params;
  const _id = toObjectId(id);

  if (!_id) return error("Not a valid item id", 400);

  try {
    const items = await getItems();
    const item = await items.findOne({ _id });

    if (!item) return error("Item not found", 404);

    await recordAudit(user, "READ", id, item.name);

    return json(item);
  } catch (err) {
    return serverError(err, `GET /api/item/${id}`, "Could not read from the database");
  }
}

// PUT /api/item/:id — update the name and/or description.
export async function PUT(request: NextRequest, ctx: RouteContext<"/api/item/[id]">) {
  const user = requireUser(request);
  if (user instanceof Response) return user;

  const { id } = await ctx.params;
  const _id = toObjectId(id);

  if (!_id) return error("Not a valid item id", 400);

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON", 400);
  }

  const { name, description } = (body ?? {}) as Record<string, unknown>;
  const changes: { name?: string; description?: string } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim() === "") {
      return error("`name` must be a non-empty string", 400);
    }
    changes.name = name.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      return error("`description` must be a string", 400);
    }
    changes.description = description;
  }

  if (Object.keys(changes).length === 0) {
    return error("Provide `name` and/or `description` to update", 400);
  }

  try {
    const items = await getItems();
    const item = await items.findOneAndUpdate(
      { _id },
      { $set: { ...changes, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!item) return error("Item not found", 404);

    await recordAudit(user, "UPDATE", id, item.name);

    return json(item);
  } catch (err) {
    return serverError(err, `PUT /api/item/${id}`, "Could not write to the database");
  }
}

// DELETE /api/item/:id — remove the item; the audit entry keeps its name.
export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/item/[id]">) {
  const user = requireUser(request);
  if (user instanceof Response) return user;

  const { id } = await ctx.params;
  const _id = toObjectId(id);

  if (!_id) return error("Not a valid item id", 400);

  try {
    const items = await getItems();
    const item = await items.findOneAndDelete({ _id });

    if (!item) return error("Item not found", 404);

    await recordAudit(user, "DELETE", id, item.name);

    return json({ message: "Item deleted" });
  } catch (err) {
    return serverError(err, `DELETE /api/item/${id}`, "Could not write to the database");
  }
}

export async function OPTIONS() {
  return preflight();
}
