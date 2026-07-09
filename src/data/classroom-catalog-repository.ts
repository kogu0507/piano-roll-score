import {
  validateClassroomCatalog,
  type ClassroomCatalog,
  type ClassroomCatalogSong,
} from "../schema/classroom-catalog-schema";
import { validateSong, type Song } from "../schema/song-schema";
import type {
  DataLoadResult,
  FetchLike,
} from "./builtin-song-repository";

export interface LoadedClassroomCatalogSong extends ClassroomCatalogSong {
  readonly resolvedSongUrl: string;
}

export interface LoadedClassroomCatalog {
  readonly catalog: ClassroomCatalog;
  readonly catalogUrl: string;
  readonly songs: readonly LoadedClassroomCatalogSong[];
}

const ALLOWED_EXTERNAL_CATALOG_PROTOCOLS = new Set(["http:", "https:"]);

function isAllowedCatalogUrl(url: URL): boolean {
  return ALLOWED_EXTERNAL_CATALOG_PROTOCOLS.has(url.protocol);
}

function toUrlValidationError(
  path: string,
  message: string,
): DataLoadResult<string> {
  return {
    success: false,
    error: {
      kind: "validation",
      message,
      issues: [
        {
          path,
          message,
        },
      ],
    },
  };
}

export function resolveClassroomCatalogUrl(
  rawUrl: string,
  baseHref: string,
): DataLoadResult<string> {
  const trimmedUrl = rawUrl.trim();

  if (trimmedUrl.length === 0) {
    return toUrlValidationError(
      "catalogUrl",
      "教室カタログURLを入力してください。",
    );
  }

  let url: URL;

  try {
    url = new URL(trimmedUrl, baseHref);
  } catch {
    return toUrlValidationError(
      "catalogUrl",
      "教室カタログURLとして解釈できません。",
    );
  }

  if (!isAllowedCatalogUrl(url)) {
    return toUrlValidationError(
      "catalogUrl",
      "教室カタログURLはhttpまたはhttpsで指定してください。",
    );
  }

  return {
    success: true,
    data: url.href,
  };
}

export function resolveClassroomSongUrl(
  rawSongUrl: string,
  catalogUrl: string,
  path = "songs.songUrl",
): DataLoadResult<string> {
  const trimmedUrl = rawSongUrl.trim();

  if (trimmedUrl.length === 0) {
    return toUrlValidationError(path, "曲JSONのsongUrlを入力してください。");
  }

  let url: URL;

  try {
    url = new URL(trimmedUrl, catalogUrl);
  } catch {
    return toUrlValidationError(path, "曲JSONのsongUrlとして解釈できません。");
  }

  if (!isAllowedCatalogUrl(url)) {
    return toUrlValidationError(
      path,
      "曲JSONのsongUrlはhttpまたはhttpsで指定してください。",
    );
  }

  return {
    success: true,
    data: url.href,
  };
}

async function fetchJson(
  url: string,
  fetcher: FetchLike,
  targetName: string,
): Promise<DataLoadResult<unknown>> {
  let response: Response;

  try {
    response = await fetcher(url, { cache: "no-cache" });
  } catch {
    return {
      success: false,
      error: {
        kind: "network",
        message: `${targetName}の取得中に通信エラーが発生しました。`,
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
            ? `${targetName}が見つかりません。`
            : `${targetName}を取得できませんでした（HTTP ${response.status}）。`,
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
        message: `${targetName}をJSONとして解析できませんでした。`,
      },
    };
  }
}

export async function loadClassroomCatalog(
  rawCatalogUrl: string,
  baseHref: string,
  fetcher: FetchLike = fetch,
): Promise<DataLoadResult<LoadedClassroomCatalog>> {
  const catalogUrl = resolveClassroomCatalogUrl(rawCatalogUrl, baseHref);

  if (!catalogUrl.success) {
    return catalogUrl;
  }

  const fetched = await fetchJson(catalogUrl.data, fetcher, "教室カタログ");

  if (!fetched.success) {
    return fetched;
  }

  const validated = validateClassroomCatalog(fetched.data);

  if (!validated.success) {
    return {
      success: false,
      error: {
        kind: "validation",
        message: "教室カタログの内容が正しくありません。",
        issues: validated.issues,
      },
    };
  }

  const songs: LoadedClassroomCatalogSong[] = [];

  for (const [index, song] of validated.data.songs.entries()) {
    const resolvedSongUrl = resolveClassroomSongUrl(
      song.songUrl,
      catalogUrl.data,
      `songs.${index}.songUrl`,
    );

    if (!resolvedSongUrl.success) {
      return resolvedSongUrl;
    }

    songs.push({
      ...song,
      resolvedSongUrl: resolvedSongUrl.data,
    });
  }

  return {
    success: true,
    data: {
      catalog: validated.data,
      catalogUrl: catalogUrl.data,
      songs,
    },
  };
}

export async function loadClassroomCatalogSong(
  song: LoadedClassroomCatalogSong,
  fetcher: FetchLike = fetch,
): Promise<DataLoadResult<Song>> {
  const fetched = await fetchJson(song.resolvedSongUrl, fetcher, "曲JSON");

  if (!fetched.success) {
    return fetched;
  }

  const validated = validateSong(fetched.data);

  if (!validated.success) {
    return {
      success: false,
      error: {
        kind: "validation",
        message: "曲JSONの内容が正しくありません。",
        issues: validated.issues,
      },
    };
  }

  return validated;
}
