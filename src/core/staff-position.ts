import type { PitchSpellingInput } from "./pitch";
import type { Song } from "../schema/song-schema";

export const STAFF_LINE_SPACING = 18;

const DIATONIC_STEP_OFFSETS = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
} as const satisfies Readonly<Record<PitchSpellingInput["step"], number>>;

const CLEF_BOTTOM_LINES = {
  treble: {
    step: "E",
    accidental: "natural",
    octave: 4,
  },
  bass: {
    step: "G",
    accidental: "natural",
    octave: 2,
  },
} as const satisfies Readonly<Record<Song["clef"], PitchSpellingInput>>;

export interface StaffLinePosition {
  readonly indexFromBottom: number;
  readonly diatonicOffset: number;
  readonly y: number;
}

export interface StaffGeometry {
  readonly clef: Song["clef"];
  readonly bottomLineSpelling: PitchSpellingInput;
  readonly bottomLineDiatonicIndex: number;
  readonly topLineDiatonicIndex: number;
  readonly bottomLineY: number;
  readonly topLineY: number;
  readonly lineSpacing: number;
  readonly halfStep: number;
  readonly lines: readonly StaffLinePosition[];
}

export interface StaffNotePosition {
  readonly y: number;
  readonly diatonicIndex: number;
  readonly diatonicOffset: number;
}

export function spellingToDiatonicIndex(
  spelling: PitchSpellingInput,
): number {
  return spelling.octave * 7 + DIATONIC_STEP_OFFSETS[spelling.step];
}

export function getClefBottomLineSpelling(
  clef: Song["clef"],
): PitchSpellingInput {
  return CLEF_BOTTOM_LINES[clef];
}

export function createStaffGeometry(
  clef: Song["clef"],
  bottomLineY: number,
  lineSpacing = STAFF_LINE_SPACING,
): StaffGeometry {
  const bottomLineSpelling = getClefBottomLineSpelling(clef);
  const bottomLineDiatonicIndex = spellingToDiatonicIndex(
    bottomLineSpelling,
  );
  const halfStep = lineSpacing / 2;
  const lines = Array.from({ length: 5 }, (_, indexFromBottom) => ({
    indexFromBottom,
    diatonicOffset: indexFromBottom * 2,
    y: bottomLineY - indexFromBottom * lineSpacing,
  }));

  return {
    clef,
    bottomLineSpelling,
    bottomLineDiatonicIndex,
    topLineDiatonicIndex: bottomLineDiatonicIndex + 8,
    bottomLineY,
    topLineY: bottomLineY - 4 * lineSpacing,
    lineSpacing,
    halfStep,
    lines,
  };
}

export function calculateStaffNotePosition(
  spelling: PitchSpellingInput,
  geometry: StaffGeometry,
): StaffNotePosition {
  const diatonicIndex = spellingToDiatonicIndex(spelling);
  const diatonicOffset = diatonicIndex - geometry.bottomLineDiatonicIndex;

  return {
    y: geometry.bottomLineY - diatonicOffset * geometry.halfStep,
    diatonicIndex,
    diatonicOffset,
  };
}

export function getLedgerLineOffsets(
  diatonicOffset: number,
): readonly number[] {
  const offsets: number[] = [];

  if (diatonicOffset < 0) {
    for (let offset = -2; offset >= diatonicOffset; offset -= 2) {
      offsets.push(offset);
    }
  }

  if (diatonicOffset > 8) {
    for (let offset = 10; offset <= diatonicOffset; offset += 2) {
      offsets.push(offset);
    }
  }

  return offsets;
}

export function isStaffLineOffset(diatonicOffset: number): boolean {
  return (
    diatonicOffset >= 0 &&
    diatonicOffset <= 8 &&
    diatonicOffset % 2 === 0
  );
}
