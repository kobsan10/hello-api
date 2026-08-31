"use client";

import { useState } from "react";

export type PlainNote = {
  _id: string;
  title: string;
  content: string;
  status?: "ACTIVE" | "DELETED";
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export default function NotesClient({
  initialNotes,
  loadError,
}: {
  initialNotes: PlainNote[];
  loadError: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [showDeleted, setShowDeleted] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState(loadError);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Every refresh happens inside an event handler, so the page needs no effect:
  // the first render's data already arrived from the server component.
  async function refresh(withDeleted: boolean) {
    const res = await fetch(
      `/api/notes${withDeleted ? "?includeDeleted=true" : ""}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
    setNotes(data);
  }

  async function toggleShowDeleted(next: boolean) {
    setShowDeleted(next);
    try {
      await refresh(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function createNote(event: React.FormEvent) {
    event.preventDefault();
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
      setTitle("");
      setContent("");
      await refresh(showDeleted);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // Soft delete: the row leaves the default list, but ticking "Show deleted"
  // reveals it still in MongoDB with status DELETED.
  async function deleteNote(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed: ${res.status}`);
      await refresh(showDeleted);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <form
        onSubmit={createNote}
        className="mt-8 flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
          className="rounded border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content"
          rows={2}
          className="rounded border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />
        <button
          type="submit"
          className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Add note
        </button>
      </form>

      <label className="mt-6 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showDeleted}
          onChange={(e) => toggleShowDeleted(e.target.checked)}
        />
        Show deleted notes
      </label>

      {error && (
        <p className="mt-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {notes.length === 0 && (
          <li className="text-sm text-zinc-500">No notes yet.</li>
        )}

        {notes.map((note) => {
          const isDeleted = note.status === "DELETED";

          return (
            <li
              key={note._id}
              className={`flex items-start justify-between gap-4 rounded-lg border border-black/10 p-4 dark:border-white/15 ${
                isDeleted ? "opacity-60" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className={`font-medium ${isDeleted ? "line-through" : ""}`}>
                    {note.title}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      isDeleted
                        ? "bg-red-500/15 text-red-700 dark:text-red-400"
                        : "bg-green-500/15 text-green-700 dark:text-green-400"
                    }`}
                  >
                    {note.status ?? "ACTIVE"}
                  </span>
                </div>
                <p className="mt-1 break-words text-sm text-zinc-600 dark:text-zinc-400">
                  {note.content}
                </p>
                <p className="mt-2 font-mono text-[11px] text-zinc-500">{note._id}</p>
              </div>

              {!isDeleted && (
                <button
                  onClick={() => deleteNote(note._id)}
                  disabled={busyId === note._id}
                  className="shrink-0 rounded-full border border-red-500/40 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                >
                  {busyId === note._id ? "Deleting…" : "Delete"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
