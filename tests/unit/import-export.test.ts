import { describe, expect, it } from "vitest";

import {
  createSongFileName,
  createSongJsonBlob,
  isJsonFileName,
  readJsonFile,
  sanitizeFileBasename,
} from "../../src/data/import-export";
import { validateSong, type Song } from "../../src/schema/song-schema";

function createSong(
  overrides: Partial<Pick<Song, "id" | "title">> = {},
): Song {
  const result = validateSong({
    schemaVersion: 1,
    id: "safe-id",
    title: "書き出し曲",
    bpm: 80,
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
        time: 0,
        duration: 1,
      },
    ],
    ...overrides,
  });

  if (!result.success) {
    throw new Error("テスト用楽曲が不正です。");
  }

  return result.data;
}

describe("JSONファイル読み込み", () => {
  it("拡張子を大文字小文字を区別せず確認する", () => {
    expect(isJsonFileName("song.JSON")).toBe(true);
    expect(isJsonFileName("song.txt")).toBe(false);
  });

  it("2 MiBを超えるファイルを読み込み前に拒否する", async () => {
    const file = new File(["a".repeat(2 * 1024 * 1024 + 1)], "large.json");

    expect(await readJsonFile(file)).toEqual({
      success: false,
      kind: "too-large",
      message: expect.stringContaining("2 MiB"),
    });
  });
});

describe("JSONファイル書き出し", () => {
  it("安全なIDをファイル名に使う", () => {
    expect(createSongFileName(createSong())).toBe("safe-id.json");
    expect(createSongFileName(createSong({ id: "export-test" }))).toBe(
      "export-test.json",
    );
  });

  it("80文字を超える安全なIDを80文字へ制限する", () => {
    const fileName = createSongFileName(createSong({ id: "a".repeat(100) }));
    const basename = fileName.replace(/\.json$/, "");

    expect(basename).toHaveLength(80);
    expect(fileName).toBe(`${"a".repeat(80)}.json`);
  });

  it.each(["CON", "con", "PRN", "AUX", "NUL", "COM1", "COM9", "LPT1", "LPT9"])(
    "Windows予約名 %s をそのまま出力しない",
    (id) => {
      const fileName = createSongFileName(createSong({ id }));

      expect(fileName.toLowerCase()).not.toBe(`${id.toLowerCase()}.json`);
      expect(fileName).toBe(`${id}-song.json`);
    },
  );

  it("曲名経路でもWindows予約名をそのまま出力しない", () => {
    expect(createSongFileName(createSong({ id: undefined, title: "CON" }))).toBe(
      "CON-song.json",
    );
  });

  it("曲名の使用禁止文字を安全化する", () => {
    expect(
      createSongFileName(createSong({ id: undefined, title: '曲名<>:"/\\|?*' })),
    ).toBe("曲名---------.json");
  });

  it("IDも有効な曲名もない場合に既定ファイル名を使う", () => {
    expect(createSongFileName(createSong({ id: undefined, title: "..." }))).toBe(
      "piano-roll-score-song.json",
    );
  });

  it("曲名経路のファイルベース名を80文字へ制限する", () => {
    expect(sanitizeFileBasename("あ".repeat(100))).toHaveLength(80);
    expect(
      createSongFileName(createSong({ id: undefined, title: "あ".repeat(100) }))
        .replace(/\.json$/, ""),
    ).toHaveLength(80);
  });

  it("正規化済みJSONのBlobを生成する", async () => {
    const blob = createSongJsonBlob(createSong());
    const parsed = JSON.parse(await blob.text()) as {
      notes: Array<{ hand?: string }>;
    };

    expect(blob.type).toBe("application/json;charset=utf-8");
    expect(parsed.notes[0]?.hand).toBe("unspecified");
  });
});
