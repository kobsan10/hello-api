import { getNotes, type Note } from "@/lib/mongodb";
import { error, json, preflight, serverError } from "@/lib/http";

// GET /api/notes — list every note, newest first
export async function GET() {
  try {
    const notes = await getNotes();
    const documents = await notes.find().sort({ createdAt: -1 }).toArray();

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
