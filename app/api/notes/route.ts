import { getNotes, NOT_DELETED, STATUS, type Note } from "@/lib/mongodb";
import { error, json, preflight, serverError } from "@/lib/http";

/**
 * GET /api/notes — list notes, newest first.
 *
 * Soft-deleted notes are filtered out. Pass `?includeDeleted=true` to see them too,
 * which is handy for showing that a "deleted" note is still in the database.
 */
export async function GET(request: Request) {
  const includeDeleted =
    new URL(request.url).searchParams.get("includeDeleted") === "true";

  try {
    const notes = await getNotes();
    const filter = includeDeleted ? {} : NOT_DELETED;
    const documents = await notes.find(filter).sort({ createdAt: -1 }).toArray();

    return json(documents);
  } catch (err) {
    return serverError(err, "GET /api/notes", "Could not read from the database");
  }
}

// POST /api/notes — create a note from a JSON body: { "title": "...", "content": "..." }
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON", 400);
  }

  const { title, content } = (body ?? {}) as Record<string, unknown>;

  if (typeof title !== "string" || title.trim() === "") {
    return error("`title` is required and must be a non-empty string", 400);
  }

  if (typeof content !== "string") {
    return error("`content` is required and must be a string", 400);
  }

  try {
    const notes = await getNotes();
    const now = new Date();
    const note: Note = {
      title: title.trim(),
      content,
      status: STATUS.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };

    const result = await notes.insertOne(note);

    return json({ _id: result.insertedId, ...note }, 201);
  } catch (err) {
    return serverError(err, "POST /api/notes", "Could not write to the database");
  }
}

export async function OPTIONS() {
  return preflight();
}
