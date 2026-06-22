import { describe, expect, it } from "vitest";

import {
  formatJapanesePitchClassName,
  formatJapanesePitchName,
  pitchMatchesSpelling,
  spellingToMidi,
} from "../../src/core/pitch";

describe("音高ユーティリティ", () => {
  it("ド♯4とレ♭4をともにMIDI番号61として扱う", () => {
    const cSharp4 = {
      step: "C",
      accidental: "sharp",
      octave: 4,
    } as const;
    const dFlat4 = {
      step: "D",
      accidental: "flat",
      octave: 4,
    } as const;

    expect(spellingToMidi(cSharp4)).toBe(61);
    expect(spellingToMidi(dFlat4)).toBe(61);
    expect(pitchMatchesSpelling(61, cSharp4)).toBe(true);
    expect(formatJapanesePitchName(dFlat4)).toBe("レ♭4");
    expect(formatJapanesePitchClassName(cSharp4)).toBe("ド♯");
    expect(formatJapanesePitchClassName(dFlat4)).toBe("レ♭");
  });
});
