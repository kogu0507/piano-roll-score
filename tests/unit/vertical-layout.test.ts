import { describe, expect, it } from "vitest";

import {
  PIXELS_PER_BEAT,
  calculateNoteVerticalRectangle,
  createVerticalScene,
  isRectangleVisible,
} from "../../src/core/vertical-layout";
import type { Song } from "../../src/schema/song-schema";

const enharmonicSong: Song = {
  schemaVersion: 1,
  title: "異名同音",
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
      finger: 2,
      time: 1,
      duration: 0.5,
    },
  ],
};

describe("縦表示シーン", () => {
  it("C♯4とD♭4を同じ横位置、異なるラベルにする", () => {
    const scene = createVerticalScene(enharmonicSong, {
      width: 320,
      height: 480,
      whiteKeyWidth: 80,
      horizontalOffset: 24,
    });
    const cSharp = scene.notes.find((note) => note.id === "c-sharp");
    const dFlat = scene.notes.find((note) => note.id === "d-flat");

    expect(cSharp?.x).toBe(dFlat?.x);
    expect(cSharp?.width).toBe(dFlat?.width);
    expect(cSharp?.label).toBe("ド♯");
    expect(dFlat?.label).toBe("レ♭");
  });

  it("timeとdurationから上向きの縦位置と高さを計算する", () => {
    expect(calculateNoteVerticalRectangle(2, 1.5, 500)).toEqual({
      bottomY: 500 - 2 * PIXELS_PER_BEAT,
      y: 500 - 3.5 * PIXELS_PER_BEAT,
      height: 1.5 * PIXELS_PER_BEAT,
    });
  });

  it("currentBeatに応じて音符が下方向へ流れる", () => {
    expect(
      calculateNoteVerticalRectangle(2, 1.5, 500, PIXELS_PER_BEAT, 1),
    ).toEqual({
      bottomY: 500 - PIXELS_PER_BEAT,
      y: 500 - 2.5 * PIXELS_PER_BEAT,
      height: 1.5 * PIXELS_PER_BEAT,
    });

    const before = createVerticalScene(enharmonicSong, {
      width: 320,
      height: 480,
      whiteKeyWidth: 80,
      horizontalOffset: 24,
      currentBeat: 0,
    });
    const after = createVerticalScene(enharmonicSong, {
      width: 320,
      height: 480,
      whiteKeyWidth: 80,
      horizontalOffset: 24,
      currentBeat: 0.5,
    });
    const beforeNote = before.notes.find((note) => note.id === "d-flat");
    const afterNote = after.notes.find((note) => note.id === "d-flat");

    expect(afterNote?.y).toBe((beforeNote?.y ?? 0) + 0.5 * PIXELS_PER_BEAT);
    expect(after.currentBeat).toBe(0.5);
  });

  it("displayBeatを使うと実再生位置と別に助走位置を描画できる", () => {
    const before = createVerticalScene(enharmonicSong, {
      width: 320,
      height: 480,
      whiteKeyWidth: 80,
      horizontalOffset: 24,
      currentBeat: 0,
      displayBeat: -4,
    });
    const after = createVerticalScene(enharmonicSong, {
      width: 320,
      height: 480,
      whiteKeyWidth: 80,
      horizontalOffset: 24,
      currentBeat: 0,
      displayBeat: -3.5,
    });
    const beforeNote = before.notes.find((note) => note.id === "c-sharp");
    const afterNote = after.notes.find((note) => note.id === "c-sharp");

    expect(before.displayBeat).toBe(-4);
    expect(after.displayBeat).toBe(-3.5);
    expect(afterNote?.y).toBe((beforeNote?.y ?? 0) + 0.5 * PIXELS_PER_BEAT);
  });

  it("0拍の音符の下端を再生ガイドへ一致させる", () => {
    const rectangle = calculateNoteVerticalRectangle(0, 1, 408);

    expect(rectangle.bottomY).toBe(408);
    expect(rectangle.y + rectangle.height).toBe(408);
  });

  it("currentBeatが音符開始時刻と一致すると音符下端を再生ガイドへ一致させる", () => {
    const rectangle = calculateNoteVerticalRectangle(
      2,
      1,
      408,
      PIXELS_PER_BEAT,
      2,
    );

    expect(rectangle.bottomY).toBe(408);
    expect(rectangle.y + rectangle.height).toBe(408);
  });

  it("Canvas外の矩形を非表示と判定する", () => {
    expect(
      isRectangleVisible(
        { x: 10, y: 10, width: 20, height: 20 },
        100,
        100,
      ),
    ).toBe(true);
    expect(
      isRectangleVisible(
        { x: 10, y: -80, width: 20, height: 20 },
        100,
        100,
      ),
    ).toBe(false);
    expect(
      isRectangleVisible(
        { x: 120, y: 10, width: 20, height: 20 },
        100,
        100,
      ),
    ).toBe(false);
  });

  it("音価の幅を小さくすると縦方向の音符長と移動量を圧縮する", () => {
    const compactPixelsPerBeat = PIXELS_PER_BEAT * 0.5;
    const normal = createVerticalScene(enharmonicSong, {
      width: 320,
      height: 480,
      whiteKeyWidth: 80,
      horizontalOffset: 24,
      currentBeat: 0,
    });
    const compact = createVerticalScene(enharmonicSong, {
      width: 320,
      height: 480,
      whiteKeyWidth: 80,
      horizontalOffset: 24,
      pixelsPerBeat: compactPixelsPerBeat,
      currentBeat: 0,
    });
    const normalAfter = createVerticalScene(enharmonicSong, {
      width: 320,
      height: 480,
      whiteKeyWidth: 80,
      horizontalOffset: 24,
      currentBeat: 0.5,
    });
    const compactAfter = createVerticalScene(enharmonicSong, {
      width: 320,
      height: 480,
      whiteKeyWidth: 80,
      horizontalOffset: 24,
      pixelsPerBeat: compactPixelsPerBeat,
      currentBeat: 0.5,
    });
    const normalNote = normal.notes.find((note) => note.id === "d-flat");
    const compactNote = compact.notes.find((note) => note.id === "d-flat");
    const normalAfterNote = normalAfter.notes.find(
      (note) => note.id === "d-flat",
    );
    const compactAfterNote = compactAfter.notes.find(
      (note) => note.id === "d-flat",
    );

    expect(compact.pixelsPerBeat).toBe(compactPixelsPerBeat);
    expect(compactNote?.height).toBe((normalNote?.height ?? 0) * 0.5);
    expect((compactAfterNote?.y ?? 0) - (compactNote?.y ?? 0)).toBe(
      ((normalAfterNote?.y ?? 0) - (normalNote?.y ?? 0)) * 0.5,
    );
  });
});
