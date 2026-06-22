import { describe, expect, it } from "vitest";

import {
  MAX_JSON_BYTES,
  formatSongJson,
  getUtf8ByteLength,
  getVisibleValidationIssues,
  parseAndValidateSongJson,
  stripUtf8Bom,
} from "../../src/data/song-json";
import { validateSong } from "../../src/schema/song-schema";

function createValidSong(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    title: "JSONテスト曲",
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
  };
}

describe("楽曲JSON変換", () => {
  it("空文字を拒否する", () => {
    expect(parseAndValidateSongJson(" \n ").success).toBe(false);
  });

  it("正常なJSONを解析・検証できる", () => {
    const result = parseAndValidateSongJson(
      JSON.stringify(createValidSong()),
    );

    expect(result.success).toBe(true);
  });

  it("先頭BOM付きJSONを扱える", () => {
    const text = `\uFEFF${JSON.stringify(createValidSong())}`;

    expect(stripUtf8Bom(text).startsWith("{")).toBe(true);
    expect(parseAndValidateSongJson(text).success).toBe(true);
  });

  it("JSON構文エラーを区別する", () => {
    const result = parseAndValidateSongJson("{");

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({
        kind: "json",
        issues: [expect.objectContaining({ path: "JSON" })],
      }),
    });
  });

  it("スキーマエラーを画面用情報として返す", () => {
    const result = parseAndValidateSongJson(
      JSON.stringify({ ...createValidSong(), bpm: 10 }),
    );

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({
        kind: "schema",
        issues: [
          expect.objectContaining({
            path: "bpm",
            message: expect.stringContaining("20以上"),
          }),
        ],
      }),
    });
  });

  it("2 MiBを超える入力を拒否する", () => {
    const result = parseAndValidateSongJson("a".repeat(MAX_JSON_BYTES + 1));

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({ kind: "too-large" }),
    });
  });

  it("UTF-8のマルチバイト文字をバイト数で判定する", () => {
    expect(getUtf8ByteLength("あ")).toBe(3);
    expect(
      parseAndValidateSongJson("あ".repeat(Math.floor(MAX_JSON_BYTES / 3) + 1))
        .success,
    ).toBe(false);
  });

  it("検証済み楽曲を2スペースで整形し、既定値を含める", () => {
    const validated = validateSong(createValidSong());
    expect(validated.success).toBe(true);

    if (validated.success) {
      const formatted = formatSongJson(validated.data);
      const parsed = JSON.parse(formatted) as {
        notes: Array<{ hand?: string }>;
      };

      expect(formatted).toContain('\n  "title": "JSONテスト曲"');
      expect(formatted.endsWith("\n")).toBe(true);
      expect(parsed.notes[0]?.hand).toBe("unspecified");
    }
  });

  it("画面へ表示する検証エラーを20件に制限する", () => {
    const issues = Array.from({ length: 25 }, (_, index) => ({
      path: `notes.${index}`,
      message: "エラー",
    }));

    expect(getVisibleValidationIssues(issues)).toEqual({
      visible: issues.slice(0, 20),
      remainingCount: 5,
    });
  });
});
