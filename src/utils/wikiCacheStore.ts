// Persistent IndexedDB cache for sanitized wiki HTML; every call is best-effort and fails silently.
const DB_NAME = "timelines-wiki-cache";
const STORE_NAME = "articles";
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;

type WikiCacheEntry = {
  key: string;
  html: string;
  fetchedAt: number;
  lastUsedAt: number;
  bytes: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function isWikiCacheEntry(value: unknown): value is WikiCacheEntry {
  return typeof value === "object" && value !== null
    && "key" in value && typeof value.key === "string"
    && "html" in value && typeof value.html === "string";
}

async function prune(db: IDBDatabase) {
  const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
  const rawEntries = await requestToPromise(store.getAll());
  const entries = Array.isArray(rawEntries) ? rawEntries.filter(isWikiCacheEntry) : [];
  let total = entries.reduce((sum, e) => sum + (e.bytes || 0), 0);
  if (total <= MAX_TOTAL_BYTES) return;
  entries.sort((a, b) => (a.lastUsedAt || 0) - (b.lastUsedAt || 0));
  for (const entry of entries) {
    if (total <= MAX_TOTAL_BYTES) break;
    store.delete(entry.key);
    total -= entry.bytes || 0;
  }
}

export async function getWikiCacheEntry(key: string): Promise<WikiCacheEntry | null> {
  try {
    const db = await openDb();
    const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
    const entry = await requestToPromise(store.get(key));
    if (!isWikiCacheEntry(entry)) return null;
    store.put({ ...entry, lastUsedAt: Date.now() });
    return entry;
  } catch {
    return null;
  }
}

export async function setWikiCacheEntry(key: string, html: string) {
  try {
    const bytes = html.length * 2;
    if (bytes > MAX_ENTRY_BYTES) return;
    const db = await openDb();
    const now = Date.now();
    const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
    await requestToPromise(store.put({ key, html, fetchedAt: now, lastUsedAt: now, bytes }));
    await prune(db);
  } catch {
    // Cache writes are best-effort; the in-memory LRU still works.
  }
}
