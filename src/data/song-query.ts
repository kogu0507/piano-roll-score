import {
  isValidBuiltinSongId,
  type DataLoadError,
  type DataLoadResult,
} from "./builtin-song-repository";

export function getSongIdFromSearch(
  search: string,
): DataLoadResult<string | undefined> {
  const id = new URLSearchParams(search).get("id");

  if (id === null) {
    return {
      success: true,
      data: undefined,
    };
  }

  if (!isValidBuiltinSongId(id)) {
    const error: DataLoadError = {
      kind: "invalid-id",
      message:
        "URLの曲IDが正しくありません。サンプル一覧から選び直してください。",
    };

    return {
      success: false,
      error,
    };
  }

  return {
    success: true,
    data: id,
  };
}

export function getCatalogUrlFromSearch(search: string): string | undefined {
  const catalog = new URLSearchParams(search).get("catalog");

  if (catalog === null || catalog.trim().length === 0) {
    return undefined;
  }

  return catalog;
}
