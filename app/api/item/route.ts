import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { error, json, preflight, serverError } from "@/lib/http";
import { getItems, type Item } from "@/lib/mongodb";

// Every handler below requires a valid session and writes an audit entry.

// GET /api/item — list items, newest first.
export async function GET(request: NextRequest) {
  const user = requireUser(request);
  if (user instanceof Response) return user;

  try {
    const items = await getItems();
    const documents = await items.find().sort({ createdAt: -1 }).toArray();

    await recordAudit(user, "LIST", undefined, `${documents.length} ${documents.length === 1 ? "item" : "items"}`);

    return json(documents);
  } catch (err) {
    return serverError(err, "GET /api/item", "Could not read from the database");
  }
}

// POST /api/item — body: { "name": "...", "description": "..." }
export async function POST(request: NextRequest) {
  const user = requireUser(request);
  if (user instanceof Response) return user;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON", 400);
  }

  const { name, description } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || name.trim() === "") {
    return error("`name` is required and must be a non-empty string", 400);
  }

  if (description !== undefined && typeof description !== "string") {
    return error("`description` must be a string", 400);
  }

  try {
    const items = await getItems();
    const now = new Date();
    const item: Item = {
      name: name.trim(),
      description: description ?? "",
      createdBy: user.username,
      createdAt: now,
      updatedAt: now,
    };

    const result = await items.insertOne(item);
    await recordAudit(user, "CREATE", result.insertedId.toString(), item.name);

    return json({ _id: result.insertedId, ...item }, 201);
  } catch (err) {
    return serverError(err, "POST /api/item", "Could not write to the database");
  }
}

export async function OPTIONS() {
  return preflight();
}
