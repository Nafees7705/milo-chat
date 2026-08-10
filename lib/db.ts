import mongoose from "mongoose";
import dns from "node:dns";

const MONGODB_URI = process.env.MONGODB_URI;

const RETRY_AFTER_MS = 60_000; // don't re-attempt an unreachable cluster for a minute

/**
 * The MongoDB driver resolves `mongodb+srv://` URIs with SRV/TXT lookups.
 * Some local resolvers (VPN / DNS-filter tools bound to 127.0.0.1) refuse
 * those record types, which makes a perfectly good Atlas URI fail with
 * `querySrv ECONNREFUSED`. When that happens, switch to public resolvers.
 */
export async function ensureSrvDns(): Promise<void> {
  if (!MONGODB_URI || !MONGODB_URI.startsWith("mongodb+srv://")) return;
  const host = MONGODB_URI.split("@")[1]?.split("/")[0];
  if (!host || host.length > 253) return;

  const probe = () =>
    dns.promises.resolveSrv(`_mongodb._tcp.${host}`).then(
      () => true,
      () => false
    );

  if (await probe()) return;
  for (const server of ["8.8.8.8", "1.1.1.1"]) {
    try {
      dns.setServers([server]);
      if (await probe()) {
        console.info(`[db] Using DNS server ${server} for MongoDB SRV lookups.`);
        return;
      }
    } catch {
      /* keep trying the next resolver */
    }
  }
}

type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null; failedAt: number };

const globalForMongoose = globalThis as unknown as { __mongoose?: Cached };

const cached: Cached = globalForMongoose.__mongoose ?? { conn: null, promise: null, failedAt: 0 };

export function canUseMongo(): boolean {
  return Boolean(MONGODB_URI);
}

let lastDbError: string | null = null;

export function getLastDbError(): string | null {
  return lastDbError;
}

export async function connectDB(): Promise<boolean> {
  if (!canUseMongo()) return false;
  await ensureSrvDns();
  if (cached.conn) return true;
  if (cached.failedAt && Date.now() - cached.failedAt < RETRY_AFTER_MS) return false;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI!, { bufferCommands: false, serverSelectionTimeoutMS: 8000 })
      .then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
    return true;
  } catch (err) {
    lastDbError = err instanceof Error ? err.message : String(err);
    console.warn("[db] Mongo connection failed, falling back to local store.", err);
    cached.promise = null;
    cached.failedAt = Date.now();
    return false;
  }
}
