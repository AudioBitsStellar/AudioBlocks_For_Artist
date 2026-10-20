/**
 * Persists chunked song uploads in IndexedDB so an interrupted upload can be
 * resumed after the page reloads. The server keeps uploaded chunks for 24h,
 * so sessions expire on the same schedule.
 */

const DB_NAME = "audioblocks-upload-sessions";
const STORE_NAME = "sessions";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface UploadSession {
  fileId: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
  totalChunks: number;
  uploadedChunks: number[];
  updatedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "fileId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export function isSessionExpired(session: UploadSession, now = Date.now()) {
  return now - session.updatedAt > SESSION_TTL_MS;
}

/** A session can only be resumed with the exact file it was started from. */
export function isSameFile(session: UploadSession, file: File) {
  return (
    session.fileName === file.name &&
    session.fileSize === file.size &&
    session.lastModified === file.lastModified
  );
}

export async function saveUploadSession(session: UploadSession): Promise<void> {
  await withStore("readwrite", (store) => store.put(session));
}

export async function deleteUploadSession(fileId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(fileId));
}

/** Returns unexpired sessions, most recently updated first. Expired sessions are removed. */
export async function getPendingUploadSessions(now = Date.now()): Promise<UploadSession[]> {
  const sessions = await withStore<UploadSession[]>("readonly", (store) => store.getAll());
  const expired = sessions.filter((session) => isSessionExpired(session, now));

  await Promise.all(expired.map((session) => deleteUploadSession(session.fileId)));

  return sessions
    .filter((session) => !isSessionExpired(session, now))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
