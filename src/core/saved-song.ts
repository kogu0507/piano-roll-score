import { validateSong, type Song } from "../schema/song-schema";

export const SAVED_SONG_RECORD_VERSION = 1;

export interface SavedSongRecord {
  readonly version: typeof SAVED_SONG_RECORD_VERSION;
  readonly id: string;
  readonly title: string;
  readonly savedAt: string;
  readonly updatedAt: string;
  readonly song: Song;
}

export interface SavedSongSummary {
  readonly id: string;
  readonly title: string;
  readonly savedAt: string;
  readonly updatedAt: string;
}

export interface SavedSongRecordOptions {
  readonly id: string;
  readonly existingRecord?: SavedSongRecord;
  readonly now?: Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function createSavedSongRecord(
  song: Song,
  options: SavedSongRecordOptions,
): SavedSongRecord {
  const now = (options.now ?? new Date()).toISOString();

  return {
    version: SAVED_SONG_RECORD_VERSION,
    id: options.id,
    title: song.title,
    savedAt: options.existingRecord?.savedAt ?? now,
    updatedAt: now,
    song,
  };
}

export function normalizeSavedSongRecord(
  input: unknown,
): SavedSongRecord | undefined {
  if (!isRecord(input) || input.version !== SAVED_SONG_RECORD_VERSION) {
    return undefined;
  }

  if (
    typeof input.id !== "string" ||
    input.id.trim().length === 0 ||
    typeof input.title !== "string" ||
    input.title.trim().length === 0 ||
    !isIsoDateString(input.savedAt) ||
    !isIsoDateString(input.updatedAt)
  ) {
    return undefined;
  }

  const songResult = validateSong(input.song);

  if (!songResult.success) {
    return undefined;
  }

  return {
    version: SAVED_SONG_RECORD_VERSION,
    id: input.id,
    title: input.title,
    savedAt: input.savedAt,
    updatedAt: input.updatedAt,
    song: songResult.data,
  };
}

export function createSavedSongSummary(
  record: SavedSongRecord,
): SavedSongSummary {
  return {
    id: record.id,
    title: record.title,
    savedAt: record.savedAt,
    updatedAt: record.updatedAt,
  };
}

export function compareSavedSongSummaryDescending(
  left: SavedSongSummary,
  right: SavedSongSummary,
): number {
  return right.updatedAt.localeCompare(left.updatedAt);
}

export function formatSavedSongTimestamp(
  isoTimestamp: string,
  locale = "ja-JP",
): string {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return isoTimestamp;
  }

  return date.toLocaleString(locale);
}
