import { describe, expect, it } from "vitest";

import {
  HORIZONTAL_JUDGMENT_LINE_X,
  HORIZONTAL_NOTE_HEIGHT_RATIO,
  HORIZONTAL_PIXELS_PER_BEAT,
  calculateHorizontalNoteHeight,
  calculateNoteHorizontalRectangle,
  createHorizontalScene,
  isHorizontalRectangleVisible,
} from "../../src/core/horizontal-layout";
import type { Song } from "../../src/schema/song-schema";

const enharmonicSong: Song = {
  schemaVersion: 1,
  title: "横表示テスト",
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
      id: "c-sharp",
      pitch: 61,
      spelling: {
        step: "C",
        accidental: "sharp",
        octave: 4,
      },
      hand: "right",
      finger: 2,
      time: 0,
      duration: 1,
    },
    {
      id: "d-flat",
      pitch: 61,
      spelling: {
        step: "D",
        accidental: "flat",
        octave: 4,
      },
      hand: "left",
      finger: 3,
      time: 1,
      duration: 0.5,
    },
  ],
};

describe("横表示シーン", () => {
  it("timeから横位置、durationから音符幅を計算する", () => {
    expect(calculateNoteHorizontalRectangle(2, 1.5)).toEqual({
      x: HORIZONTAL_JUDGMENT_LINE_X + 2 * HORIZONTAL_PIXELS_PER_BEAT,
      width: 1.5 * HORIZONTAL_PIXELS_PER_BEAT,
      rightX: HORIZONTAL_JUDGMENT_LINE_X + 3.5 * HORIZONTAL_PIXELS_PER_BEAT,
    });
  });

  it("0拍の音符開始位置を判定ラインへ一致させる", () => {
    const scene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
    });
    const firstNote = scene.notes.find((note) => note.id === "c-sharp");

    expect(firstNote?.x).toBe(scene.judgmentLineX);
  });

  it("音符ブロック高さを五線の線間隔以内にし、中心位置を維持する", () => {
    const scene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
    });
    const firstNote = scene.notes.find((note) => note.id === "c-sharp");

    expect(calculateHorizontalNoteHeight(scene.staff.lineSpacing)).toBeCloseTo(
      scene.staff.lineSpacing * HORIZONTAL_NOTE_HEIGHT_RATIO,
    );
    expect(HORIZONTAL_NOTE_HEIGHT_RATIO).toBeGreaterThanOrEqual(0.9);
    expect(HORIZONTAL_NOTE_HEIGHT_RATIO).toBeLessThanOrEqual(1);
    expect(firstNote?.height).toBeCloseTo(
      scene.staff.lineSpacing * HORIZONTAL_NOTE_HEIGHT_RATIO,
    );
    expect(firstNote?.height).toBeLessThanOrEqual(scene.staff.lineSpacing);
    expect((firstNote?.y ?? 0) + (firstNote?.height ?? 0) / 2).toBeCloseTo(
      firstNote?.staffY ?? 0,
    );
  });

  it("C♯4とD♭4を異なる五線上の縦位置にし、変化記号を区別する", () => {
    const scene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
    });
    const cSharp = scene.notes.find((note) => note.id === "c-sharp");
    const dFlat = scene.notes.find((note) => note.id === "d-flat");

    expect(cSharp?.staffY).not.toBe(dFlat?.staffY);
    expect(cSharp?.staffY).toBeGreaterThan(dFlat?.staffY ?? 0);
    expect(cSharp?.label).toBe("ド♯");
    expect(dFlat?.label).toBe("レ♭");
    expect(cSharp?.accidentalSymbol).toBe("♯");
    expect(dFlat?.accidentalSymbol).toBe("♭");
  });

  it("太い五線5本線と控えめな補助グリッドの位置情報を分ける", () => {
    const scene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
    });

    expect(scene.staffLines).toHaveLength(5);
    expect(scene.guideLines.some((line) => !line.isStaffLine)).toBe(true);
    expect(scene.guideLines.filter((line) => line.isStaffLine)).toHaveLength(5);
  });

  it("五線外の音に補助線を付ける", () => {
    const scene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
    });
    const cSharp = scene.notes.find((note) => note.id === "c-sharp");
    const dFlat = scene.notes.find((note) => note.id === "d-flat");

    expect(cSharp?.ledgerLines.map((line) => line.diatonicOffset)).toEqual([
      -2,
    ]);
    expect(dFlat?.ledgerLines).toHaveLength(0);
  });

  it("Canvas外の音符を判定できる", () => {
    expect(
      isHorizontalRectangleVisible(
        { x: 10, y: 10, width: 20, height: 20 },
        100,
        100,
      ),
    ).toBe(true);
    expect(
      isHorizontalRectangleVisible(
        { x: 120, y: 10, width: 20, height: 20 },
        100,
        100,
      ),
    ).toBe(false);
    expect(
      isHorizontalRectangleVisible(
        { x: 10, y: 120, width: 20, height: 20 },
        100,
        100,
      ),
    ).toBe(false);
  });
});
