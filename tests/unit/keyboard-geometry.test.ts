import { describe, expect, it } from "vitest";

import {
  BLACK_KEY_WIDTH_RATIO,
  MAX_WHITE_KEY_WIDTH,
  MIN_WHITE_KEY_WIDTH,
  calculateCenteredOffset,
  createKeyboardGeometry,
  fitWhiteKeyWidth,
  getPitchRectangle,
  getWhiteKeyOrdinal,
  isBlackKey,
  isWhiteKey,
  normalizeRangeToWhiteKeys,
  preserveContentCenterOffset,
  resolveSongPitchRange,
} from "../../src/core/keyboard-geometry";
import type { Song } from "../../src/schema/song-schema";

function createSong(
  displayRange: Song["displayRange"],
  pitches: readonly number[],
): Song {
  return {
    schemaVersion: 1,
    title: "鍵盤幾何テスト",
    bpm: 80,
    timeSignature: {
      numerator: 4,
      denominator: 4,
    },
    clef: "treble",
    displayRange,
    notes: pitches.map((pitch, index) => ({
      id: `note-${index}`,
      pitch,
      spelling: {
        step: pitch === 67 ? "G" : "C",
        accidental: "natural",
        octave: 4,
      },
      hand: "unspecified",
      time: index,
      duration: 1,
    })),
  };
}

describe("鍵盤幾何", () => {
  it("白鍵と黒鍵を分類し、白鍵通し番号を連続させる", () => {
    expect(isWhiteKey(60)).toBe(true);
    expect(isBlackKey(61)).toBe(true);
    expect(isWhiteKey(62)).toBe(true);
    expect(getWhiteKeyOrdinal(62) - getWhiteKeyOrdinal(60)).toBe(1);
  });

  it("B-C間とE-F間に黒鍵を作らない", () => {
    const geometry = createKeyboardGeometry(
      { minPitch: 59, maxPitch: 65 },
      40,
    );

    expect(geometry.blackKeys.map((key) => key.pitch)).toEqual([61, 63]);
  });

  it.each([
    [{ minPitch: 60, maxPitch: 67 }, 5],
    [{ minPitch: 60, maxPitch: 62 }, 2],
  ])("%oを白鍵%d鍵分へ正規化する", (range, expectedCount) => {
    expect(createKeyboardGeometry(range, 40).whiteKeys).toHaveLength(
      expectedCount,
    );
  });

  it("C♯4だけの範囲にC4とD4を含める", () => {
    expect(normalizeRangeToWhiteKeys({ minPitch: 61, maxPitch: 61 })).toEqual({
      minPitch: 60,
      maxPitch: 62,
    });
  });

  it("autoでは音符、fixedでは指定値から範囲を決める", () => {
    const autoSong = createSong({ mode: "auto" }, [60, 67]);
    const fixedSong = createSong(
      { mode: "fixed", minPitch: 55, maxPitch: 72 },
      [60, 67],
    );

    expect(resolveSongPitchRange(autoSong)).toEqual({
      minPitch: 60,
      maxPitch: 67,
    });
    expect(resolveSongPitchRange(fixedSong)).toEqual({
      minPitch: 55,
      maxPitch: 72,
    });
  });

  it("白鍵幅を全幅、音符位置、黒鍵幅へ反映する", () => {
    const narrow = createKeyboardGeometry(
      { minPitch: 60, maxPitch: 67 },
      40,
    );
    const wide = createKeyboardGeometry(
      { minPitch: 60, maxPitch: 67 },
      80,
    );
    const narrowCSharp = getPitchRectangle(narrow, 61);
    const wideCSharp = getPitchRectangle(wide, 61);

    expect(narrow.totalWidth).toBe(200);
    expect(wide.totalWidth).toBe(400);
    expect(wideCSharp?.x).toBeCloseTo((narrowCSharp?.x ?? 0) * 2);
    expect(wide.blackKeyWidth).toBe(80 * BLACK_KEY_WIDTH_RATIO);
  });

  it("画面幅に合わせる白鍵幅を16から320へ制限する", () => {
    expect(fitWhiteKeyWidth(100, 10)).toBe(MIN_WHITE_KEY_WIDTH);
    expect(fitWhiteKeyWidth(1_000, 10)).toBe(100);
    expect(fitWhiteKeyWidth(10_000, 10)).toBe(MAX_WHITE_KEY_WIDTH);
  });

  it("対象音域を中央へ配置できる", () => {
    expect(calculateCenteredOffset(390, 300)).toBe(45);
    expect(calculateCenteredOffset(300, 390)).toBe(-45);
  });

  it("幅変更時に対象音域の画面上の中心を維持する", () => {
    const nextOffset = preserveContentCenterOffset(40, 200, 360);

    expect(nextOffset).toBe(-40);
    expect(40 + 200 / 2).toBe(nextOffset + 360 / 2);
  });
});
