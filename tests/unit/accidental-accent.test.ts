import { describe, expect, it } from "vitest";

import { getAccidentalAccentStyle } from "../../src/renderers/accidental-accent";

describe("accidental note accent styles", () => {
  it("does not accent natural notes", () => {
    expect(getAccidentalAccentStyle("natural")).toBeUndefined();
  });

  it("accents sharp and flat notes with distinguishable marker styles", () => {
    const sharp = getAccidentalAccentStyle("sharp");
    const flat = getAccidentalAccentStyle("flat");

    expect(sharp?.kind).toBe("sharp");
    expect(flat?.kind).toBe("flat");
    expect(sharp?.markerFill).not.toBe(flat?.markerFill);
    expect(sharp?.stroke).not.toBe(flat?.stroke);
    expect(sharp?.bandWidth).toBeGreaterThan(0);
    expect(flat?.bandWidth).toBe(sharp?.bandWidth);
  });
});
