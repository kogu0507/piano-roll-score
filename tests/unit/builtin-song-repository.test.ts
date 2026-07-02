import { describe, expect, it, vi } from "vitest";

import {
  buildBuiltinSongIndexUrl,
  buildBuiltinSongUrl,
  loadBuiltinSong,
  type FetchLike,
} from "../../src/data/builtin-song-repository";
import { getSongIdFromSearch } from "../../src/data/song-query";

const validSong = {
  schemaVersion: 1,
  id: "001",
  title: "ド",
  bpm: 80,
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

describe("内蔵曲URL", () => {
  it("/app/piano-roll-score/を基準に一覧と曲のURLを組み立てる", () => {
    expect(buildBuiltinSongIndexUrl("/app/piano-roll-score/")).toBe(
      "/app/piano-roll-score/data/songs/index.json",
    );
    expect(buildBuiltinSongUrl("/app/piano-roll-score/", "001")).toEqual({
      success: true,
      data: "/app/piano-roll-score/data/songs/001.json",
    });
  });

  it("URLから曲IDを取得し、不正なIDを拒否する", () => {
    expect(getSongIdFromSearch("?id=001")).toEqual({
      success: true,
      data: "001",
    });
    expect(getSongIdFromSearch("").success).toBe(true);
    expect(getSongIdFromSearch("?id=../001").success).toBe(false);
  });
});

describe("内蔵曲取得", () => {
  it.each(["001", "002"])(
    "要求ID %s と一致する曲を検証済み楽曲として返す",
    async (id) => {
      const song = { ...validSong, id };
      const fetcher = vi.fn(async () =>
        response(JSON.stringify(song)),
      ) as FetchLike;
      const result = await loadBuiltinSong(
        "/app/piano-roll-score/",
        id,
        fetcher,
      );

      expect(result.success).toBe(true);
      expect(fetcher).toHaveBeenCalledWith(
        `/app/piano-roll-score/data/songs/${id}.json`,
        { cache: "no-cache" },
      );
    },
  );

  it("内蔵曲取得時は同一URLの更新を確認しやすいfetch設定を使う", async () => {
    const fetcher = vi.fn(async () =>
      response(JSON.stringify(validSong)),
    ) as FetchLike;
    const result = await loadBuiltinSong(
      "/app/piano-roll-score/",
      "001",
      fetcher,
    );

    expect(result.success).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      "/app/piano-roll-score/data/songs/001.json",
      { cache: "no-cache" },
    );
  });

  it("内蔵曲データのID欠落を検証エラーにする", async () => {
    const { id: _id, ...songWithoutId } = validSong;
    const fetcher = vi.fn(async () =>
      response(JSON.stringify(songWithoutId)),
    ) as FetchLike;
    const result = await loadBuiltinSong(
      "/app/piano-roll-score/",
      "001",
      fetcher,
    );

    expect(result).toEqual({
      success: false,
      error: {
        kind: "validation",
        message: "内蔵曲のIDが指定されていません。",
        issues: [
          expect.objectContaining({
            path: "id",
            message: expect.stringContaining("001"),
          }),
        ],
      },
    });
  });

  it("要求IDと内蔵曲データのID不一致を検証エラーにする", async () => {
    const fetcher = vi.fn(async () =>
      response(JSON.stringify({ ...validSong, id: "002" })),
    ) as FetchLike;
    const result = await loadBuiltinSong(
      "/app/piano-roll-score/",
      "001",
      fetcher,
    );

    expect(result).toEqual({
      success: false,
      error: {
        kind: "validation",
        message: "内蔵曲のIDが要求されたIDと一致しません。",
        issues: [
          expect.objectContaining({
            path: "id",
            message: expect.stringMatching(/001.*002/),
          }),
        ],
      },
    });
  });

  it("404を区別する", async () => {
    const fetcher = vi.fn(async () => response("", 404)) as FetchLike;
    const result = await loadBuiltinSong(
      "/app/piano-roll-score/",
      "missing",
      fetcher,
    );

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({ kind: "http", status: 404 }),
    });
  });

  it("JSON不正を区別する", async () => {
    const fetcher = vi.fn(async () => response("{")) as FetchLike;
    const result = await loadBuiltinSong(
      "/app/piano-roll-score/",
      "001",
      fetcher,
    );

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({ kind: "json" }),
    });
  });

  it("スキーマ不正を区別する", async () => {
    const fetcher = vi.fn(async () =>
      response(JSON.stringify({ ...validSong, notes: [] })),
    ) as FetchLike;
    const result = await loadBuiltinSong(
      "/app/piano-roll-score/",
      "001",
      fetcher,
    );

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({ kind: "validation" }),
    });
  });
});
