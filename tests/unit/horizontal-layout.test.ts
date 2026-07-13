import { describe, expect, it } from "vitest";

import {
  HORIZONTAL_JUDGMENT_LINE_X,
  HORIZONTAL_NOTE_HEIGHT_RATIO,
  HORIZONTAL_PLAYBACK_GUIDE_X,
  MAX_HORIZONTAL_LINE_SPACING,
  MIN_HORIZONTAL_LINE_SPACING,
  HORIZONTAL_VERTICAL_PADDING,
  calculateFittedHorizontalLineSpacing,
  calculateHorizontalContentHeight,
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

const pickupSong: Song = {
  ...enharmonicSong,
  title: "アウフタクト横表示",
  pickupBeats: 1.5,
  notes: [
    {
      ...enharmonicSong.notes[0]!,
      id: "pickup-start",
      time: -1.5,
      duration: 0.5,
    },
    {
      ...enharmonicSong.notes[1]!,
      id: "bar-start",
      time: 0,
      duration: 1,
    },
  ],
};

const bassLeftHandSong: Song = {
  schemaVersion: 1,
  title: "低音部左手テスト",
  bpm: 80,
  timeSignature: {
    numerator: 4,
    denominator: 4,
  },
  clef: "bass",
  displayRange: {
    mode: "fixed",
    minPitch: 48,
    maxPitch: 57,
  },
  notes: [
    {
      id: "left-c3",
      pitch: 48,
      spelling: {
        step: "C",
        accidental: "natural",
        octave: 3,
      },
      hand: "left",
      finger: 5,
      time: 0,
      duration: 1,
    },
    {
      id: "left-d3",
      pitch: 50,
      spelling: {
        step: "D",
        accidental: "natural",
        octave: 3,
      },
      hand: "left",
      finger: 4,
      time: 1,
      duration: 1,
    },
    {
      id: "left-a3",
      pitch: 57,
      spelling: {
        step: "A",
        accidental: "natural",
        octave: 3,
      },
      hand: "left",
      finger: 1,
      time: 2,
      duration: 1,
    },
  ],
};

describe("横表示シーン", () => {
  it("timeから横位置、durationから音符幅を計算する", () => {
    expect(calculateNoteHorizontalRectangle(2, 1.5)).toEqual({
      x: HORIZONTAL_PLAYBACK_GUIDE_X + 2 * HORIZONTAL_PIXELS_PER_BEAT,
      width: 1.5 * HORIZONTAL_PIXELS_PER_BEAT,
      rightX: HORIZONTAL_PLAYBACK_GUIDE_X + 3.5 * HORIZONTAL_PIXELS_PER_BEAT,
    });
  });

  it("currentBeatに応じて音符が左方向へ流れる", () => {
    expect(
      calculateNoteHorizontalRectangle(
        2,
        1.5,
        HORIZONTAL_JUDGMENT_LINE_X,
        HORIZONTAL_PIXELS_PER_BEAT,
        1,
      ),
    ).toEqual({
      x: HORIZONTAL_JUDGMENT_LINE_X + HORIZONTAL_PIXELS_PER_BEAT,
      width: 1.5 * HORIZONTAL_PIXELS_PER_BEAT,
      rightX: HORIZONTAL_JUDGMENT_LINE_X + 2.5 * HORIZONTAL_PIXELS_PER_BEAT,
    });

    const before = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      currentBeat: 0,
    });
    const after = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      currentBeat: 0.5,
    });
    const beforeNote = before.notes.find((note) => note.id === "d-flat");
    const afterNote = after.notes.find((note) => note.id === "d-flat");

    expect(afterNote?.x).toBe(
      (beforeNote?.x ?? 0) - 0.5 * HORIZONTAL_PIXELS_PER_BEAT,
    );
    expect(after.currentBeat).toBe(0.5);
  });

  it("displayBeatを使うと実再生位置と別に助走位置を描画できる", () => {
    const before = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      currentBeat: 0,
      displayBeat: -4,
    });
    const after = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      currentBeat: 0,
      displayBeat: -3.5,
    });
    const beforeNote = before.notes.find((note) => note.id === "c-sharp");
    const afterNote = after.notes.find((note) => note.id === "c-sharp");

    expect(before.displayBeat).toBe(-4);
    expect(after.displayBeat).toBe(-3.5);
    expect(afterNote?.x).toBe(
      (beforeNote?.x ?? 0) - 0.5 * HORIZONTAL_PIXELS_PER_BEAT,
    );
  });

  it("0拍の音符開始位置を再生ガイドへ一致させる", () => {
    const scene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
    });
    const firstNote = scene.notes.find((note) => note.id === "c-sharp");

    expect(firstNote?.x).toBe(scene.playbackGuideX);
  });

  it("currentBeatが音符開始時刻と一致すると音符左端を再生ガイドへ一致させる", () => {
    const scene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      currentBeat: 1,
    });
    const dFlat = scene.notes.find((note) => note.id === "d-flat");

    expect(dFlat?.x).toBe(scene.playbackGuideX);
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

  it("五線間隔の変更に合わせて音符高さと五線座標を再計算する", () => {
    const compactScene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      lineSpacing: 12,
    });
    const expandedScene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      lineSpacing: 30,
    });
    const compactCSharp = compactScene.notes.find(
      (note) => note.id === "c-sharp",
    );
    const compactDFlat = compactScene.notes.find(
      (note) => note.id === "d-flat",
    );
    const expandedCSharp = expandedScene.notes.find(
      (note) => note.id === "c-sharp",
    );
    const expandedDFlat = expandedScene.notes.find(
      (note) => note.id === "d-flat",
    );

    if (
      compactCSharp === undefined ||
      compactDFlat === undefined ||
      expandedCSharp === undefined ||
      expandedDFlat === undefined
    ) {
      throw new Error("テスト対象の音符が見つかりません。");
    }

    expect(compactScene.staff.lineSpacing).toBe(12);
    expect(expandedScene.staff.lineSpacing).toBe(30);
    expect(compactCSharp.height).toBeCloseTo(12 * HORIZONTAL_NOTE_HEIGHT_RATIO);
    expect(expandedCSharp.height).toBeCloseTo(30 * HORIZONTAL_NOTE_HEIGHT_RATIO);
    expect(compactCSharp.height).toBeLessThanOrEqual(
      compactScene.staff.lineSpacing,
    );
    expect(expandedCSharp.height).toBeLessThanOrEqual(
      expandedScene.staff.lineSpacing,
    );
    expect(compactCSharp.staffY - compactDFlat.staffY).toBeCloseTo(6);
    expect(expandedCSharp.staffY - expandedDFlat.staffY).toBeCloseTo(15);
  });

  it("譜面の縦位置変更で五線、補助線、音符を同じ量だけ移動する", () => {
    const baseScene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      lineSpacing: 18,
    });
    const shiftedScene = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      lineSpacing: 18,
      verticalOffset: 32,
    });
    const baseCSharp = baseScene.notes.find((note) => note.id === "c-sharp");
    const shiftedCSharp = shiftedScene.notes.find(
      (note) => note.id === "c-sharp",
    );
    const baseBottomStaffLine = baseScene.staffLines[0];
    const shiftedBottomStaffLine = shiftedScene.staffLines[0];
    const baseLedgerLine = baseCSharp?.ledgerLines[0];
    const shiftedLedgerLine = shiftedCSharp?.ledgerLines[0];

    if (
      baseCSharp === undefined ||
      shiftedCSharp === undefined ||
      baseBottomStaffLine === undefined ||
      shiftedBottomStaffLine === undefined ||
      baseLedgerLine === undefined ||
      shiftedLedgerLine === undefined
    ) {
      throw new Error("テスト対象の音符が見つかりません。");
    }

    expect(shiftedScene.verticalOffset).toBe(32);
    expect(shiftedBottomStaffLine.y - baseBottomStaffLine.y).toBe(32);
    expect(shiftedCSharp.staffY - baseCSharp.staffY).toBe(32);
    expect(shiftedCSharp.y - baseCSharp.y).toBe(32);
    expect(shiftedLedgerLine.y - baseLedgerLine.y).toBe(32);
    expect(shiftedCSharp.diatonicOffset).toBe(baseCSharp.diatonicOffset);
  });

  it("画面高に合わせる線間隔を範囲内で計算し、内容高さを表示可能範囲に収める", () => {
    const fittedSpacing = calculateFittedHorizontalLineSpacing(
      enharmonicSong,
      220,
    );
    const contentHeight = calculateHorizontalContentHeight(
      enharmonicSong,
      fittedSpacing,
    );

    expect(fittedSpacing).toBeGreaterThanOrEqual(MIN_HORIZONTAL_LINE_SPACING);
    expect(fittedSpacing).toBeLessThanOrEqual(MAX_HORIZONTAL_LINE_SPACING);
    expect(contentHeight).toBeLessThanOrEqual(
      220 - HORIZONTAL_VERTICAL_PADDING * 2,
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
    expect(cSharp?.accidental).toBe("sharp");
    expect(dFlat?.accidental).toBe("flat");
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

  it("低音部譜表ではC3からA3の左手音符をヘ音記号の五線位置へ配置する", () => {
    const scene = createHorizontalScene(bassLeftHandSong, {
      width: 640,
      height: 360,
      lineSpacing: 18,
    });
    const c3 = scene.notes.find((note) => note.id === "left-c3");
    const d3 = scene.notes.find((note) => note.id === "left-d3");
    const a3 = scene.notes.find((note) => note.id === "left-a3");

    expect(scene.staff.clef).toBe("bass");
    expect(scene.staff.bottomLineSpelling).toEqual({
      step: "G",
      accidental: "natural",
      octave: 2,
    });
    expect(scene.notes.map((note) => note.hand)).toEqual([
      "left",
      "left",
      "left",
    ]);
    expect(c3?.diatonicOffset).toBe(3);
    expect(d3?.diatonicOffset).toBe(4);
    expect(a3?.diatonicOffset).toBe(8);
    expect(c3?.staffY).toBeGreaterThan(d3?.staffY ?? 0);
    expect(d3?.staffY).toBeGreaterThan(a3?.staffY ?? 0);
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

  it("音価の幅を小さくすると横方向の音符幅と移動量を圧縮する", () => {
    const compactPixelsPerBeat = HORIZONTAL_PIXELS_PER_BEAT * 0.5;
    const normal = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      currentBeat: 0,
    });
    const compact = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      pixelsPerBeat: compactPixelsPerBeat,
      currentBeat: 0,
    });
    const normalAfter = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      currentBeat: 0.5,
    });
    const compactAfter = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
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
    expect(compactNote?.width).toBe((normalNote?.width ?? 0) * 0.5);
    expect((compactAfterNote?.x ?? 0) - (compactNote?.x ?? 0)).toBe(
      ((normalAfterNote?.x ?? 0) - (normalNote?.x ?? 0)) * 0.5,
    );
  });

  it("拍線と小節線をスコア表示の時間軸へ配置し、音価の幅に追従する", () => {
    const normal = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      currentBeat: 0,
    });
    const compact = createHorizontalScene(enharmonicSong, {
      width: 640,
      height: 360,
      pixelsPerBeat: HORIZONTAL_PIXELS_PER_BEAT * 0.5,
      currentBeat: 0,
    });
    const normalMeasure0 = normal.beatLines.find((line) => line.beat === 0);
    const normalBeat1 = normal.beatLines.find((line) => line.beat === 1);
    const normalMeasure4 = normal.beatLines.find((line) => line.beat === 4);
    const compactMeasure0 = compact.beatLines.find((line) => line.beat === 0);
    const compactBeat1 = compact.beatLines.find((line) => line.beat === 1);

    expect(normalMeasure0?.kind).toBe("measure");
    expect(normalBeat1?.kind).toBe("beat");
    expect(normalMeasure4?.kind).toBe("measure");
    expect(normalMeasure0?.x).toBe(normal.playbackGuideX);
    expect((normalBeat1?.x ?? 0) - (normalMeasure0?.x ?? 0)).toBe(
      HORIZONTAL_PIXELS_PER_BEAT,
    );
    expect((compactBeat1?.x ?? 0) - (compactMeasure0?.x ?? 0)).toBe(
      HORIZONTAL_PIXELS_PER_BEAT * 0.5,
    );
  });

  it("アウフタクト曲では正規化後の再生時刻で音符と小節線を配置する", () => {
    const scene = createHorizontalScene(pickupSong, {
      width: 640,
      height: 360,
      currentBeat: 0,
    });
    const pickupStart = scene.notes.find((note) => note.id === "pickup-start");
    const barStart = scene.notes.find((note) => note.id === "bar-start");
    const firstMeasure = scene.beatLines.find((line) => line.beat === 0);
    const pickupBeat = scene.beatLines.find((line) => line.beat === -1);

    expect(pickupStart?.x).toBe(scene.playbackGuideX);
    expect(barStart?.x).toBe(
      scene.playbackGuideX + 1.5 * HORIZONTAL_PIXELS_PER_BEAT,
    );
    expect(firstMeasure).toMatchObject({
      kind: "measure",
      x: scene.playbackGuideX + 1.5 * HORIZONTAL_PIXELS_PER_BEAT,
    });
    expect(pickupBeat).toMatchObject({
      kind: "beat",
      x: scene.playbackGuideX + 0.5 * HORIZONTAL_PIXELS_PER_BEAT,
    });
  });
});
