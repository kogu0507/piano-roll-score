import { describe, expect, it } from "vitest";

import { getAccidentalAccentStyle } from "../../src/renderers/accidental-accent";
import { shouldShowAccidentalAccentSymbol } from "../../src/renderers/accidental-accent-renderer";

describe("accidental note accent styles", () => {
  it("does not accent natural notes", () => {
    expect(getAccidentalAccentStyle("natural")).toBeUndefined();
  });

  it("accents sharp and flat notes with distinguishable marker styles", () => {
    const sharp = getAccidentalAccentStyle("sharp");
    const flat = getAccidentalAccentStyle("flat");

    expect(sharp?.kind).toBe("sharp");
    expect(flat?.kind).toBe("flat");
    expect(sharp?.markerFill).toBe("rgba(202, 132, 35, 0.82)");
    expect(sharp?.stroke).toBe("#b36b13");
    expect(flat?.markerFill).toBe("rgba(72, 96, 184, 0.82)");
    expect(flat?.stroke).toBe("#4559aa");
    expect(sharp?.symbol).toBe("♯");
    expect(flat?.symbol).toBe("♭");
    expect(sharp?.markerFill).not.toBe(flat?.markerFill);
    expect(sharp?.stroke).not.toBe(flat?.stroke);
    expect(sharp?.bandWidth).toBe(7);
    expect(flat?.bandWidth).toBe(sharp?.bandWidth);
  });

  it("shows accidental symbol markers only when note names are hidden", () => {
    expect(shouldShowAccidentalAccentSymbol({ showNoteNames: true })).toBe(
      false,
    );
    expect(shouldShowAccidentalAccentSymbol({ showNoteNames: undefined })).toBe(
      false,
    );
    expect(shouldShowAccidentalAccentSymbol({ showNoteNames: false })).toBe(
      true,
    );
  });
});
