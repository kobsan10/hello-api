This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database setup (MongoDB Atlas)

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com) (Shared / M0 tier is enough).
2. **Database Access** → *Add New Database User*. Pick password authentication and note the username and password.
3. **Network Access** → *Add IP Address*. Use *Add Current IP Address* for local development.
4. **Clusters** → *Connect* → *Drivers* → *Node.js*. Copy the connection string.
5. Copy `.env.example` to `.env.local` and paste the string into `MONGODB_URI`, replacing
   `<db_password>` with your database user's password:

   ```bash
   cp .env.example .env.local
   ```

`.env.local` is gitignored, so the credentials stay out of the repository. The database and
the `notes` collection are created automatically on the first insert — no need to make them
by hand in Atlas.

Restart `npm run dev` after editing `.env.local`.

## API

The API is implemented with [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)
in `app/api/`. All responses are JSON and include permissive CORS headers so a separate
frontend can call them.

| Method   | Route                            | Description                                             |
| -------- | -------------------------------- | ------------------------------------------------------- |
| `GET`    | `/api/hello`                     | Returns `{ "message": "hello world" }`                  |
| `GET`    | `/api/notes`                     | Lists notes that are not deleted, newest first          |
| `GET`    | `/api/notes?includeDeleted=true` | Lists notes **including** soft-deleted ones             |
| `POST`   | `/api/notes`                     | Creates a note from `{ title, content }`                |
| `GET`    | `/api/notes/:id`                 | Returns a single note (404 if soft deleted)             |
| `PUT`    | `/api/notes/:id`                 | Updates `title` and/or `content` of a note              |
| `DELETE` | `/api/notes/:id`                 | **Soft** deletes — sets `status` to `DELETED`           |

A note document looks like this:

```json
{
  "_id": "6708c1f2a4b9e5d3c2a10f88",
  "title": "First note",
  "content": "Stored in MongoDB Atlas.",
  "status": "ACTIVE",
  "createdAt": "2026-08-24T04:15:02.481Z",
  "updatedAt": "2026-08-24T04:15:02.481Z"
}
```

There is also a browser UI at **[http://localhost:3000/notes](http://localhost:3000/notes)**
for creating and deleting notes, with a *Show deleted notes* toggle.

## Soft delete

`DELETE /api/notes/:id` does **not** remove the document. It updates it — the same
`findOneAndUpdate` mechanism `PUT` uses — setting:

```js
{ status: "DELETED", deletedAt: <now>, updatedAt: <now> }
```

The document stays in the collection, so the data remains recoverable and auditable.
Every read path then filters it out, which is what makes the deletion *look* real to a
client.

### Filtering deleted items in MongoDB

Reads share one filter, defined in [`lib/mongodb.ts`](lib/mongodb.ts):

```js
const NOT_DELETED = { status: { $ne: "DELETED" } }
```

It is used three ways:

```js
// list — only notes that are not deleted
await notes.find(NOT_DELETED).sort({ createdAt: -1 }).toArray()

// read one — a deleted note responds 404
await notes.findOne({ _id, ...NOT_DELETED })

// delete — flip the status instead of removing the document
await notes.findOneAndUpdate(
  { _id, ...NOT_DELETED },
  { $set: { status: "DELETED", deletedAt: now, updatedAt: now } },
  { returnDocument: "after" }
)
```

**Why `$ne: "DELETED"` and not `status: "ACTIVE"`?** Notes created before soft delete
existed have no `status` field at all. In MongoDB a missing field is *not equal* to
`"DELETED"`, so `$ne` still returns those older notes. An equality filter on `"ACTIVE"`
would silently hide every note written before this feature shipped. Filtering by what
you want to *exclude* is the safer default when a field is added to an existing
collection.

Including `NOT_DELETED` in the `DELETE` and `PUT` filters also means an already-deleted
note returns `404` instead of being edited or having its `deletedAt` overwritten.

Errors come back as `{ "error": "..." }` with a `400` (bad input), `404` (no such note), or
`500` (database unreachable) status.

### Files

Backend:

- `lib/mongodb.ts` — Atlas connection, the `Note` type, and the `NOT_DELETED` filter
- `lib/http.ts` — shared JSON and CORS response helpers
- `app/api/notes/route.ts` — collection routes (`GET`, `POST`)
- `app/api/notes/[id]/route.ts` — single-note routes (`GET`, `PUT`, `DELETE`)

Frontend:

- `app/notes/page.tsx` — server component; loads the initial list straight from MongoDB
- `app/notes/notes-client.tsx` — client component; create, delete, and the deleted-notes toggle

## Testing the API

Install an API testing tool — [Postman](https://www.postman.com/downloads/),
[Insomnia](https://insomnia.rest/download), or the
[REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
extension for VS Code all work. With `npm run dev` running, point it at
`http://localhost:3000`.

In Postman: set the method, enter the URL, and for `POST`/`PUT` choose **Body** → **raw** →
**JSON** before entering the payload.

The same requests with `curl`:

```bash
# Create a note — copy the "_id" from the response
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"First note","content":"Stored in MongoDB Atlas."}'

# List all notes
curl http://localhost:3000/api/notes

# Read, update, and delete one note (substitute the _id)
curl http://localhost:3000/api/notes/PASTE_ID_HERE

curl -X PUT http://localhost:3000/api/notes/PASTE_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{"content":"Updated from Postman."}'

# Soft delete — the document is kept, its status becomes DELETED
curl -X DELETE http://localhost:3000/api/notes/PASTE_ID_HERE
```

After a `POST`, the document is visible in Atlas under **Browse Collections** in the
`hello_api` database.

### Demonstrating the soft delete

```bash
# 1. Create a note and copy its _id — note "status": "ACTIVE"
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Soft delete demo","content":"Watch the status flip."}'

# 2. Delete it — the response shows "status": "DELETED" plus a deletedAt timestamp
curl -X DELETE http://localhost:3000/api/notes/PASTE_ID_HERE

# 3. The default list no longer contains it
curl http://localhost:3000/api/notes

# 4. But it is still in the database
curl "http://localhost:3000/api/notes?includeDeleted=true"
```

Step 4 is the point of the exercise: the note is gone from normal reads yet still present
in the collection. Atlas → **Browse Collections** confirms it — the document is there with
`status: "DELETED"`, and the collection's document count never dropped.

### Troubleshooting

- **`MONGODB_URI is not set`** — `.env.local` is missing or the dev server wasn't restarted after creating it.
- **Connection times out** — your current IP isn't in the Atlas **Network Access** list.
- **`bad auth: Authentication failed`** — the username or password in the connection string is wrong. Remember to replace the literal `<db_password>` placeholder, and percent-encode any special characters in the password.
- **`tlsv1 alert internal error` / `SSL alert number 80`** — Atlas refused the TLS handshake. Usually the IP isn't allow-listed or the cluster is paused; it can also be a transient Atlas blip, so retry once before changing anything.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
