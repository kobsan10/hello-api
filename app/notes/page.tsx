import { getNotes, NOT_DELETED } from "@/lib/mongodb";
import NotesClient, { type PlainNote } from "./notes-client";

// The list reflects the database on every visit, so never prerender it.
export const dynamic = "force-dynamic";

export default async function NotesPage() {
  let initialNotes: PlainNote[] = [];
  let loadError = "";

  try {
    const notes = await getNotes();
    const documents = await notes.find(NOT_DELETED).sort({ createdAt: -1 }).toArray();

    // ObjectId and Date don't cross the server/client boundary — send strings.
    initialNotes = documents.map((doc) => ({
      _id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      status: doc.status,
      createdAt: doc.createdAt?.toISOString() ?? "",
      updatedAt: doc.updatedAt?.toISOString() ?? "",
      deletedAt: doc.deletedAt?.toISOString(),
    }));
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Deleting a note is a <strong>soft delete</strong> — the document stays in MongoDB
        and its <code className="font-mono">status</code> becomes{" "}
        <code className="font-mono">DELETED</code>.
      </p>

      <NotesClient initialNotes={initialNotes} loadError={loadError} />
    </main>
  );
}
