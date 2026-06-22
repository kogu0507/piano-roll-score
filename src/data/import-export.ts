import type { Song } from "../schema/song-schema";
import { MAX_JSON_BYTES, formatSongJson } from "./song-json";

const DEFAULT_FILE_BASENAME = "piano-roll-score-song";
const MAX_FILE_BASENAME_LENGTH = 80;
const INVALID_FILE_NAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001F]/g;
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type JsonFileErrorKind = "extension" | "too-large" | "read";

export type JsonFileResult =
  | {
      readonly success: true;
      readonly text: string;
    }
  | {
      readonly success: false;
      readonly kind: JsonFileErrorKind;
      readonly message: string;
    };

export function isJsonFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".json");
}

export async function readJsonFile(file: File): Promise<JsonFileResult> {
  if (!isJsonFileName(file.name)) {
    return {
      success: false,
      kind: "extension",
      message: "拡張子が.jsonのファイルを選択してください。",
    };
  }

  if (file.size > MAX_JSON_BYTES) {
    return {
      success: false,
      kind: "too-large",
      message: "読み込めるJSONファイルは2 MiB以下です。",
    };
  }

  try {
    return {
      success: true,
      text: await file.text(),
    };
  } catch {
    return {
      success: false,
      kind: "read",
      message: "JSONファイルを読み込めませんでした。",
    };
  }
}

export function sanitizeFileBasename(value: string): string {
  return Array.from(
    value
      .normalize("NFKC")
      .replace(INVALID_FILE_NAME_CHARACTERS, "-")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/g, ""),
  )
    .slice(0, MAX_FILE_BASENAME_LENGTH)
    .join("")
    .replace(/[. ]+$/g, "");
}

export function createSongFileName(song: Song): string {
  if (song.id !== undefined && SAFE_ID_PATTERN.test(song.id)) {
    return `${song.id}.json`;
  }

  const safeTitle = sanitizeFileBasename(song.title);
  return `${safeTitle || DEFAULT_FILE_BASENAME}.json`;
}

export function createSongJsonBlob(song: Song): Blob {
  return new Blob([formatSongJson(song)], {
    type: "application/json;charset=utf-8",
  });
}

export function startBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
