import { describe, expect, it } from "vitest";

import {
  calculateStaffNotePosition,
  createStaffGeometry,
  getLedgerLineOffsets,
  spellingToDiatonicIndex,
} from "../../src/core/staff-position";

describe("五線座標", () => {
  it("ト音記号の五線5本線をE4からF5として計算する", () => {
    const staff = createStaffGeometry("treble", 200, 18);

    expect(staff.bottomLineSpelling).toEqual({
      step: "E",
      accidental: "natural",
      octave: 4,
    });
    expect(staff.lines).toHaveLength(5);
    expect(staff.lines.map((line) => line.y)).toEqual([
      200,
      182,
      164,
      146,
      128,
    ]);
    expect(staff.topLineDiatonicIndex - staff.bottomLineDiatonicIndex).toBe(8);
  });

  it("ヘ音記号の五線5本線をG2からA3として計算する", () => {
    const staff = createStaffGeometry("bass", 220, 18);

    expect(staff.bottomLineSpelling).toEqual({
      step: "G",
      accidental: "natural",
      octave: 2,
    });
    expect(staff.lines.map((line) => line.diatonicOffset)).toEqual([
      0,
      2,
      4,
      6,
      8,
    ]);
  });

  it("spellingから音名段階を計算する", () => {
    expect(
      spellingToDiatonicIndex({
        step: "C",
        accidental: "sharp",
        octave: 4,
      }),
    ).toBe(28);
    expect(
      spellingToDiatonicIndex({
        step: "D",
        accidental: "flat",
        octave: 4,
      }),
    ).toBe(29);
  });

  it("ト音記号でE4を下第1線、F4を第1線と第2線の間に置く", () => {
    const staff = createStaffGeometry("treble", 200, 18);
    const e4 = calculateStaffNotePosition(
      { step: "E", accidental: "natural", octave: 4 },
      staff,
    );
    const f4 = calculateStaffNotePosition(
      { step: "F", accidental: "natural", octave: 4 },
      staff,
    );
    const g4 = calculateStaffNotePosition(
      { step: "G", accidental: "natural", octave: 4 },
      staff,
    );

    expect(e4.y).toBe(200);
    expect(f4.y).toBe(191);
    expect(g4.y).toBe(182);
  });

  it("五線外の音に必要な補助線を判定する", () => {
    expect(getLedgerLineOffsets(-1)).toEqual([]);
    expect(getLedgerLineOffsets(-2)).toEqual([-2]);
    expect(getLedgerLineOffsets(-4)).toEqual([-2, -4]);
    expect(getLedgerLineOffsets(9)).toEqual([]);
    expect(getLedgerLineOffsets(10)).toEqual([10]);
  });
});
