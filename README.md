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

| Method   | Route             | Description                                        |
| -------- | ----------------- | -------------------------------------------------- |
| `GET`    | `/api/hello`      | Returns `{ "message": "hello world" }`             |
| `GET`    | `/api/notes`      | Lists every note, newest first                     |
| `POST`   | `/api/notes`      | Creates a note from `{ title, content }`           |
| `GET`    | `/api/notes/:id`  | Returns a single note                              |
| `PUT`    | `/api/notes/:id`  | Updates `title` and/or `content` of a note         |
| `DELETE` | `/api/notes/:id`  | Deletes a note                                     |

A note document looks like this:

```json
{
  "_id": "6708c1f2a4b9e5d3c2a10f88",
  "title": "First note",
  "content": "Stored in MongoDB Atlas.",
  "createdAt": "2026-08-24T04:15:02.481Z",
  "updatedAt": "2026-08-24T04:15:02.481Z"
}
```

Errors come back as `{ "error": "..." }` with a `400` (bad input), `404` (no such note), or
`500` (database unreachable) status.

### Files

- `lib/mongodb.ts` — connects to Atlas and caches the client across dev reloads
- `lib/http.ts` — shared JSON and CORS response helpers
- `app/api/notes/route.ts` — collection routes (`GET`, `POST`)
- `app/api/notes/[id]/route.ts` — single-note routes (`GET`, `PUT`, `DELETE`)

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

curl -X DELETE http://localhost:3000/api/notes/PASTE_ID_HERE
```

After a `POST`, the document is visible in Atlas under **Browse Collections** in the
`hello_api` database.

### Troubleshooting

- **`MONGODB_URI is not set`** — `.env.local` is missing or the dev server wasn't restarted after creating it.
- **Connection times out** — your current IP isn't in the Atlas **Network Access** list.
- **`bad auth: Authentication failed`** — the username or password in the connection string is wrong. Remember to replace the literal `<db_password>` placeholder, and percent-encode any special characters in the password.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
