import {
  BUILTIN_SONG_ID_PATTERN,
  validateBuiltinSongIndex,
  type BuiltinSongIndex,
} from "../schema/builtin-song-index-schema";
import { validateSong, type Song } from "../schema/song-schema";
import type { ValidationIssue } from "../schema/validation";

export type DataLoadErrorKind =
  | "invalid-id"
  | "network"
  | "http"
  | "json"
  | "validation";

export interface DataLoadError {
  readonly kind: DataLoadErrorKind;
  readonly message: string;
  readonly status?: number;
  readonly issues?: readonly ValidationIssue[];
}

export type DataLoadResult<T> =
  | {
      readonly success: true;
      readonly data: T;
    }
  | {
      readonly success: false;
      readonly error: DataLoadError;
    };

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

export function buildBuiltinSongIndexUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}data/songs/index.json`;
}

export function isValidBuiltinSongId(id: string): boolean {
  return BUILTIN_SONG_ID_PATTERN.test(id);
}

export function buildBuiltinSongUrl(
  baseUrl: string,
  id: string,
): DataLoadResult<string> {
  if (!isValidBuiltinSongId(id)) {
    return {
      success: false,
      error: {
        kind: "invalid-id",
        message:
          "曲IDには英数字、ハイフン、アンダースコアだけを使用できます。",
      },
    };
  }

  return {
    success: true,
    data: `${normalizeBaseUrl(baseUrl)}data/songs/${id}.json`,
  };
}

async function fetchJson(
  url: string,
  fetcher: FetchLike,
): Promise<DataLoadResult<unknown>> {
  let response: Response;

  try {
    response = await fetcher(url, { cache: "no-cache" });
  } catch {
    return {
      success: false,
      error: {
        kind: "network",
        message: "内蔵データの取得中に通信エラーが発生しました。",
      },
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error: {
        kind: "http",
        status: response.status,
        message:
          response.status === 404
            ? "指定された内蔵曲が見つかりません。"
            : `内蔵データを取得できませんでした（HTTP ${response.status}）。`,
      },
    };
  }

  try {
    return {
      success: true,
      data: JSON.parse(await response.text()) as unknown,
    };
  } catch {
    return {
      success: false,
      error: {
        kind: "json",
        message: "内蔵データをJSONとして解析できませんでした。",
      },
    };
  }
}

export async function loadBuiltinSongIndex(
  baseUrl: string,
  fetcher: FetchLike = fetch,
): Promise<DataLoadResult<BuiltinSongIndex>> {
  const fetched = await fetchJson(buildBuiltinSongIndexUrl(baseUrl), fetcher);

  if (!fetched.success) {
    return fetched;
  }

  const validated = validateBuiltinSongIndex(fetched.data);

  if (!validated.success) {
    return {
      success: false,
      error: {
        kind: "validation",
        message: "内蔵曲一覧の内容が正しくありません。",
        issues: validated.issues,
      },
    };
  }

  return validated;
}

export async function loadBuiltinSong(
  baseUrl: string,
  id: string,
  fetcher: FetchLike = fetch,
): Promise<DataLoadResult<Song>> {
  const url = buildBuiltinSongUrl(baseUrl, id);

  if (!url.success) {
    return url;
  }

  const fetched = await fetchJson(url.data, fetcher);

  if (!fetched.success) {
    return fetched;
  }

  const validated = validateSong(fetched.data);

  if (!validated.success) {
    return {
      success: false,
      error: {
        kind: "validation",
        message: "内蔵曲の内容が正しくありません。",
        issues: validated.issues,
      },
    };
  }

  if (validated.data.id === undefined) {
    return {
      success: false,
      error: {
        kind: "validation",
        message: "内蔵曲のIDが指定されていません。",
        issues: [
          {
            path: "id",
            message: `要求された内蔵曲ID「${id}」に対応するidがデータ内に必要です。`,
          },
        ],
      },
    };
  }

  if (validated.data.id !== id) {
    return {
      success: false,
      error: {
        kind: "validation",
        message: "内蔵曲のIDが要求されたIDと一致しません。",
        issues: [
          {
            path: "id",
            message: `要求IDは「${id}」ですが、データ内のidは「${validated.data.id}」です。`,
          },
        ],
      },
    };
  }

  return validated;
}
