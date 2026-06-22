export const MUSICAL_STEPS = ["A", "B", "C", "D", "E", "F", "G"] as const;
export const ACCIDENTALS = ["natural", "sharp", "flat"] as const;

export type MusicalStep = (typeof MUSICAL_STEPS)[number];
export type Accidental = (typeof ACCIDENTALS)[number];

export interface PitchSpellingInput {
  readonly step: MusicalStep;
  readonly accidental: Accidental;
  readonly octave: number;
}

const NATURAL_SEMITONES: Readonly<Record<MusicalStep, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const ACCIDENTAL_OFFSETS: Readonly<Record<Accidental, number>> = {
  natural: 0,
  sharp: 1,
  flat: -1,
};

const JAPANESE_STEP_NAMES: Readonly<Record<MusicalStep, string>> = {
  C: "ド",
  D: "レ",
  E: "ミ",
  F: "ファ",
  G: "ソ",
  A: "ラ",
  B: "シ",
};

const ACCIDENTAL_SYMBOLS: Readonly<Record<Accidental, string>> = {
  natural: "",
  sharp: "♯",
  flat: "♭",
};

export function spellingToMidi(spelling: PitchSpellingInput): number {
  return (
    (spelling.octave + 1) * 12 +
    NATURAL_SEMITONES[spelling.step] +
    ACCIDENTAL_OFFSETS[spelling.accidental]
  );
}

export function pitchMatchesSpelling(
  pitch: number,
  spelling: PitchSpellingInput,
): boolean {
  return pitch === spellingToMidi(spelling);
}

export function formatJapanesePitchName(
  spelling: PitchSpellingInput,
): string {
  return `${JAPANESE_STEP_NAMES[spelling.step]}${ACCIDENTAL_SYMBOLS[spelling.accidental]}${spelling.octave}`;
}
