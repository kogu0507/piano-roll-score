import { describe, expect, test } from "vitest";

import {
  SAVED_SONG_RECORD_VERSION,
  createSavedSongRecord,
  createSavedSongSummary,
  formatSavedSongTimestamp,
  normalizeSavedSongRecord,
} from "../../src/core/saved-song";
import type { Song } from "../../src/schema/song-schema";

const song: Song = {
  schemaVersion: 1,
  id: "unit-test",
  title: "保存テスト曲",
  description: "端末内保存の単体テスト",
  bpm: 90,
  timeSignature: {
    numerator: 4,
    denominator: 4,
  },
  clef: "treble",
  displayRange: {
    mode: "auto",
  },
  notes: [
    {
      id: "n1",
      pitch: 60,
      spelling: {
        step: "C",
        accidental: "natural",
        octave: 4,
      },
      hand: "right",
      time: 0,
      duration: 1,
    },
  ],
};

describe("saved song record", () => {
  test("保存レコードを作成し、表示用メタデータへ変換する", () => {
    const now = new Date("2026-06-29T12:00:00.000Z");
    const record = createSavedSongRecord(song, {
      id: "save-unit-test",
      now,
    });

    expect(record).toEqual({
      version: SAVED_SONG_RECORD_VERSION,
      id: "save-unit-test",
      title: "保存テスト曲",
      savedAt: "2026-06-29T12:00:00.000Z",
      updatedAt: "2026-06-29T12:00:00.000Z",
      song,
    });
    expect(createSavedSongSummary(record)).toEqual({
      id: "save-unit-test",
      title: "保存テスト曲",
      savedAt: "2026-06-29T12:00:00.000Z",
      updatedAt: "2026-06-29T12:00:00.000Z",
    });
  });

  test("同じ保存IDの更新では初回保存日時を維持する", () => {
    const initial = createSavedSongRecord(song, {
      id: "save-unit-test",
      now: new Date("2026-06-29T12:00:00.000Z"),
    });
    const updated = createSavedSongRecord(
      {
        ...song,
        title: "更新後の曲名",
      },
      {
        id: "save-unit-test",
        existingRecord: initial,
        now: new Date("2026-06-29T13:00:00.000Z"),
      },
    );

    expect(updated.savedAt).toBe(initial.savedAt);
    expect(updated.updatedAt).toBe("2026-06-29T13:00:00.000Z");
    expect(updated.title).toBe("更新後の曲名");
  });

  test("壊れた保存レコードは正規化で除外する", () => {
    const record = createSavedSongRecord(song, {
      id: "save-unit-test",
      now: new Date("2026-06-29T12:00:00.000Z"),
    });

    expect(normalizeSavedSongRecord(record)).toEqual(record);
    expect(
      normalizeSavedSongRecord({
        ...record,
        song: {
          ...song,
          bpm: 10,
        },
      }),
    ).toBeUndefined();
    expect(
      normalizeSavedSongRecord({
        ...record,
        version: 999,
      }),
    ).toBeUndefined();
  });

  test("保存日時を表示用文字列へ変換する", () => {
    expect(formatSavedSongTimestamp("2026-06-29T12:00:00.000Z")).toContain(
      "2026",
    );
    expect(formatSavedSongTimestamp("not-a-date")).toBe("not-a-date");
  });
});
