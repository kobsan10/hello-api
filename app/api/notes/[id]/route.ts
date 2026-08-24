import { ObjectId } from "mongodb";
import { getNotes } from "@/lib/mongodb";
import { error, json, preflight, serverError } from "@/lib/http";

// Mongo's _id is a 24-character hex string; anything else can't match a document.
function toObjectId(id: string): ObjectId | null {
  return /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : null;
}

// GET /api/notes/:id — read one note
export async function GET(_request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const { id } = await ctx.params;
  const _id = toObjectId(id);

  if (!_id) return error("Not a valid note id", 400);

  try {
    const notes = await getNotes();
    const note = await notes.findOne({ _id });

    if (!note) return error("Note not found", 404);

    return json(note);
  } catch (err) {
    return serverError(err, `GET /api/notes/${id}`, "Could not read from the database");
  }
}

// PUT /api/notes/:id — update the title and/or content of one note
export async function PUT(request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const { id } = await ctx.params;
  const _id = toObjectId(id);

  if (!_id) return error("Not a valid note id", 400);

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return error("Request body must be valid JSON", 400);
  }

  const { title, content } = (body ?? {}) as Record<string, unknown>;
  const changes: { title?: string; content?: string } = {};

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim() === "") {
      return error("`title` must be a non-empty string", 400);
    }
    changes.title = title.trim();
  }

  if (content !== undefined) {
    if (typeof content !== "string") {
      return error("`content` must be a string", 400);
    }
    changes.content = content;
  }

  if (Object.keys(changes).length === 0) {
    return error("Provide `title` and/or `content` to update", 400);
  }

  try {
    const notes = await getNotes();
    const note = await notes.findOneAndUpdate(
      { _id },
      { $set: { ...changes, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!note) return error("Note not found", 404);

    return json(note);
  } catch (err) {
    return serverError(err, `PUT /api/notes/${id}`, "Could not write to the database");
  }
}

// DELETE /api/notes/:id — remove one note
export async function DELETE(_request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const { id } = await ctx.params;
  const _id = toObjectId(id);

  if (!_id) return error("Not a valid note id", 400);

  try {
    const notes = await getNotes();
    const result = await notes.deleteOne({ _id });

    if (result.deletedCount === 0) return error("Note not found", 404);

    return json({ deleted: id });
  } catch (err) {
    return serverError(err, `DELETE /api/notes/${id}`, "Could not write to the database");
  }
}

export async function OPTIONS() {
  return preflight();
}
