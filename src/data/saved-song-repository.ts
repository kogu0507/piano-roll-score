import {
  compareSavedSongSummaryDescending,
  createSavedSongRecord,
  createSavedSongSummary,
  normalizeSavedSongRecord,
  type SavedSongRecord,
  type SavedSongSummary,
} from "../core/saved-song";
import type { Song } from "../schema/song-schema";

export const SAVED_SONG_DB_NAME = "piano-roll-score";
export const SAVED_SONG_DB_VERSION = 1;
export const SAVED_SONG_STORE_NAME = "savedSongs";

export interface SavedSongRepository {
  list: () => Promise<readonly SavedSongSummary[]>;
  save: (song: Song, existingSaveId?: string) => Promise<SavedSongRecord>;
  get: (id: string) => Promise<SavedSongRecord | undefined>;
  delete: (id: string) => Promise<void>;
}

function generateSavedSongId(song: Song): string {
  if (song.id !== undefined) {
    return `song-${song.id}`;
  }

  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `song-${randomId}`;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => {
      resolve(request.result);
    });
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("IndexedDB request failed."));
    });
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => {
      resolve();
    });
    transaction.addEventListener("abort", () => {
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    });
    transaction.addEventListener("error", () => {
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    });
  });
}

export class IndexedDbSavedSongRepository implements SavedSongRepository {
  private readonly indexedDb: IDBFactory | undefined;

  constructor(indexedDb: IDBFactory | undefined) {
    this.indexedDb = indexedDb;
  }

  async list(): Promise<readonly SavedSongSummary[]> {
    const database = await this.openDatabase();

    try {
      const transaction = database.transaction(
        SAVED_SONG_STORE_NAME,
        "readonly",
      );
      const request = transaction
        .objectStore(SAVED_SONG_STORE_NAME)
        .getAll() as IDBRequest<unknown[]>;
      const records = (await requestToPromise(request))
        .map((record) => normalizeSavedSongRecord(record))
        .filter(
          (record): record is SavedSongRecord => record !== undefined,
        );

      return records
        .map(createSavedSongSummary)
        .sort(compareSavedSongSummaryDescending);
    } finally {
      database.close();
    }
  }

  async save(
    song: Song,
    existingSaveId?: string,
  ): Promise<SavedSongRecord> {
    const database = await this.openDatabase();

    try {
      const id = existingSaveId ?? generateSavedSongId(song);
      const transaction = database.transaction(
        SAVED_SONG_STORE_NAME,
        "readwrite",
      );
      const store = transaction.objectStore(SAVED_SONG_STORE_NAME);
      const existingRecord = normalizeSavedSongRecord(
        await requestToPromise(store.get(id) as IDBRequest<unknown>),
      );
      const record = createSavedSongRecord(song, {
        id,
        existingRecord,
      });

      await requestToPromise(store.put(record));
      await waitForTransaction(transaction);
      return record;
    } finally {
      database.close();
    }
  }

  async get(id: string): Promise<SavedSongRecord | undefined> {
    const database = await this.openDatabase();

    try {
      const transaction = database.transaction(
        SAVED_SONG_STORE_NAME,
        "readonly",
      );
      const record = await requestToPromise(
        transaction.objectStore(SAVED_SONG_STORE_NAME).get(id) as IDBRequest<
          unknown
        >,
      );

      return normalizeSavedSongRecord(record);
    } finally {
      database.close();
    }
  }

  async delete(id: string): Promise<void> {
    const database = await this.openDatabase();

    try {
      const transaction = database.transaction(
        SAVED_SONG_STORE_NAME,
        "readwrite",
      );
      await requestToPromise(
        transaction.objectStore(SAVED_SONG_STORE_NAME).delete(id),
      );
      await waitForTransaction(transaction);
    } finally {
      database.close();
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.indexedDb === undefined) {
      return Promise.reject(
        new Error("このブラウザでは端末内保存を利用できません。"),
      );
    }

    return new Promise((resolve, reject) => {
      const request = this.indexedDb?.open(
        SAVED_SONG_DB_NAME,
        SAVED_SONG_DB_VERSION,
      );

      if (request === undefined) {
        reject(new Error("このブラウザでは端末内保存を利用できません。"));
        return;
      }

      request.addEventListener("upgradeneeded", () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(SAVED_SONG_STORE_NAME)) {
          database.createObjectStore(SAVED_SONG_STORE_NAME, {
            keyPath: "id",
          });
        }
      });
      request.addEventListener("success", () => {
        resolve(request.result);
      });
      request.addEventListener("error", () => {
        reject(request.error ?? new Error("IndexedDBを開けませんでした。"));
      });
    });
  }
}

export function createSavedSongRepository(
  indexedDb: IDBFactory | undefined =
    typeof globalThis.indexedDB === "undefined"
      ? undefined
      : globalThis.indexedDB,
): SavedSongRepository {
  return new IndexedDbSavedSongRepository(indexedDb);
}
