import {
  MongoClient,
  ServerApiVersion,
  type Collection,
  type Db,
  type Filter,
} from "mongodb";

const DB_NAME = process.env.MONGODB_DB ?? "hello_api";
const COLLECTION = "notes";
const USERS_COLLECTION = "user";

export const STATUS = {
  ACTIVE: "ACTIVE",
  DELETED: "DELETED",
} as const;

export type Status = (typeof STATUS)[keyof typeof STATUS];

export type Note = {
  title: string;
  content: string;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
  /** Set when the note is soft deleted; absent while it is active. */
  deletedAt?: Date;
};

/**
 * Matches every note that has NOT been soft deleted.
 *
 * `$ne` is used rather than `{ status: "ACTIVE" }` on purpose: notes created before
 * soft delete existed have no `status` field at all, and in MongoDB a missing field
 * is "not equal" to "DELETED" — so those older notes still show up. An equality
 * filter on "ACTIVE" would silently hide them.
 */
export const NOT_DELETED: Filter<Note> = { status: { $ne: STATUS.DELETED } };

// `next dev` re-evaluates modules on every edit, so a module-level variable would
// leak a new connection pool per reload. Caching on globalThis survives HMR.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/** Thrown when the app is misconfigured rather than the database being unreachable. */
export class ConfigError extends Error {}

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new ConfigError(
      "MONGODB_URI is not set. Copy .env.example to .env.local, paste your Atlas connection string, and restart the dev server."
    );
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  const promise = client.connect();

  // Don't cache a failed handshake — a bad password or an IP that isn't allow-listed
  // would otherwise keep failing until the server restarts.
  promise.catch(() => {
    globalThis._mongoClientPromise = undefined;
  });

  return promise;
}

export async function getDb(): Promise<Db> {
  globalThis._mongoClientPromise ??= connect();
  const client = await globalThis._mongoClientPromise;
  return client.db(DB_NAME);
}

export async function getNotes(): Promise<Collection<Note>> {
  const db = await getDb();
  return db.collection<Note>(COLLECTION);
}

export type User = {
  email: string;
  username: string;
  /** bcrypt hash — never the plaintext password. */
  password: string;
};

export async function getUsers(): Promise<Collection<User>> {
  const db = await getDb();
  return db.collection<User>(USERS_COLLECTION);
}
