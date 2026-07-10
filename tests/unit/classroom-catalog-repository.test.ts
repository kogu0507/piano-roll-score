import { describe, expect, it, vi } from "vitest";

import {
  loadClassroomCatalog,
  loadClassroomCatalogSong,
  resolveClassroomCatalogUrl,
  resolveClassroomSongUrl,
  type LoadedClassroomCatalogSong,
} from "../../src/data/classroom-catalog-repository";
import type { FetchLike } from "../../src/data/builtin-song-repository";

const catalogUrl =
  "https://example.com/app/piano-roll-score/data/classroom-catalogs/demo/catalog.json";

const validCatalog = {
  schemaVersion: 1,
  catalogType: "classroom",
  classroom: {
    displayName: "デモ教室",
    catalogName: "教室カタログ確認用",
    updatedAt: "2026-07-09",
  },
  songs: [
    {
      id: "demo-001",
      title: "メリーさんの羊",
      description: "外部カタログ読み込み確認用",
      level: "導入",
      catalogGroup: "右手",
      songUrl: "../../songs/001.json",
    },
  ],
};

const validSong = {
  schemaVersion: 1,
  id: "001",
  title: "メリーさんの羊",
  bpm: 90,
  timeSignature: { numerator: 4, denominator: 4 },
  clef: "treble",
  displayRange: { mode: "auto" },
  notes: [
    {
      id: "n1",
      pitch: 60,
      spelling: { step: "C", accidental: "natural", octave: 4 },
      time: 0,
      duration: 1,
    },
  ],
};

function response(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("教室カタログURL", () => {
  it("相対catalog URLを現在ページ基準で解決する", () => {
    expect(
      resolveClassroomCatalogUrl(
        "./data/classroom-catalogs/demo/catalog.json",
        "https://example.com/app/piano-roll-score/",
      ),
    ).toEqual({
      success: true,
      data: catalogUrl,
    });
  });

  it.each(["javascript:alert(1)", "data:application/json,{}", "file:///tmp/a"])(
    "危険なcatalog URL %s を拒否する",
    (url) => {
      const result = resolveClassroomCatalogUrl(
        url,
        "https://example.com/app/piano-roll-score/",
      );

      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({ kind: "validation" }),
      });
    },
  );

  it("songUrlをカタログURL基準で解決する", () => {
    expect(resolveClassroomSongUrl("../../songs/001.json", catalogUrl)).toEqual({
      success: true,
      data: "https://example.com/app/piano-roll-score/data/songs/001.json",
    });
  });

  it.each(["javascript:alert(1)", "data:application/json,{}", "file:///tmp/a"])(
    "危険なsongUrl %s を拒否する",
    (url) => {
      const result = resolveClassroomSongUrl(url, catalogUrl);

      expect(result).toEqual({
        success: false,
        error: expect.objectContaining({ kind: "validation" }),
      });
    },
  );
});

describe("教室カタログ取得", () => {
  it("検証済みカタログと解決済み曲URLを返す", async () => {
    const fetcher = vi.fn(async () =>
      response(JSON.stringify(validCatalog)),
    ) as FetchLike;
    const result = await loadClassroomCatalog(
      "./data/classroom-catalogs/demo/catalog.json",
      "https://example.com/app/piano-roll-score/",
      fetcher,
    );

    expect(result.success).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(catalogUrl, { cache: "no-cache" });
    if (result.success) {
      expect(result.data.songs[0]?.resolvedSongUrl).toBe(
        "https://example.com/app/piano-roll-score/data/songs/001.json",
      );
    }
  });

  it("壊れたカタログを検証エラーにする", async () => {
    const fetcher = vi.fn(async () =>
      response(JSON.stringify({ ...validCatalog, schemaVersion: 2 })),
    ) as FetchLike;
    const result = await loadClassroomCatalog(
      "./data/classroom-catalogs/demo/catalog.json",
      "https://example.com/app/piano-roll-score/",
      fetcher,
    );

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({ kind: "validation" }),
    });
  });

  it("外部カタログ内の曲JSONを既存楽曲スキーマで検証する", async () => {
    const catalogSong: LoadedClassroomCatalogSong = {
      ...validCatalog.songs[0],
      resolvedSongUrl:
        "https://example.com/app/piano-roll-score/data/songs/001.json",
    };
    const fetcher = vi.fn(async () =>
      response(JSON.stringify(validSong)),
    ) as FetchLike;
    const result = await loadClassroomCatalogSong(catalogSong, fetcher);

    expect(result.success).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(catalogSong.resolvedSongUrl, {
      cache: "no-cache",
    });
    if (result.success) {
      expect(result.data.id).toBe("001");
    }
  });
});
