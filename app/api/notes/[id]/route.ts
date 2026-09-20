import { getNotes, NOT_DELETED, STATUS, toObjectId } from "@/lib/mongodb";
import { error, json, preflight, serverError } from "@/lib/http";

// GET /api/notes/:id — read one note. A soft-deleted note reads as 404.
export async function GET(_request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const { id } = await ctx.params;
  const _id = toObjectId(id);

  if (!_id) return error("Not a valid note id", 400);

  try {
    const notes = await getNotes();
    const note = await notes.findOne({ _id, ...NOT_DELETED });

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
    // NOT_DELETED in the filter stops a soft-deleted note from being edited.
    const note = await notes.findOneAndUpdate(
      { _id, ...NOT_DELETED },
      { $set: { ...changes, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!note) return error("Note not found", 404);

    return json(note);
  } catch (err) {
    return serverError(err, `PUT /api/notes/${id}`, "Could not write to the database");
  }
}

/**
 * DELETE /api/notes/:id — soft delete.
 *
 * The document is kept and its `status` is flipped to "DELETED" instead of being
 * removed, so the data stays recoverable and auditable. This is an update, which is
 * why it uses `findOneAndUpdate` rather than `deleteOne` — the same mechanism as PUT.
 *
 * NOT_DELETED in the filter makes this return 404 on an already-deleted note rather
 * than silently overwriting `deletedAt` with a later timestamp.
 */
export async function DELETE(_request: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const { id } = await ctx.params;
  const _id = toObjectId(id);

  if (!_id) return error("Not a valid note id", 400);

  try {
    const notes = await getNotes();
    const now = new Date();
    const note = await notes.findOneAndUpdate(
      { _id, ...NOT_DELETED },
      { $set: { status: STATUS.DELETED, deletedAt: now, updatedAt: now } },
      { returnDocument: "after" }
    );

    if (!note) return error("Note not found", 404);

    return json({ message: "Note soft deleted", note });
  } catch (err) {
    return serverError(err, `DELETE /api/notes/${id}`, "Could not write to the database");
  }
}

export async function OPTIONS() {
  return preflight();
}
