import type { Accidental } from "../core/pitch";

export interface AccidentalAccentStyle {
  readonly kind: Exclude<Accidental, "natural">;
  readonly markerFill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly bandWidth: number;
}

const ACCIDENTAL_ACCENT_STYLES: Readonly<
  Record<Exclude<Accidental, "natural">, AccidentalAccentStyle>
> = {
  sharp: {
    kind: "sharp",
    markerFill: "rgba(202, 132, 35, 0.82)",
    stroke: "#b36b13",
    strokeWidth: 2.8,
    bandWidth: 5,
  },
  flat: {
    kind: "flat",
    markerFill: "rgba(72, 96, 184, 0.82)",
    stroke: "#4559aa",
    strokeWidth: 2.8,
    bandWidth: 5,
  },
};

export function getAccidentalAccentStyle(
  accidental: Accidental,
): AccidentalAccentStyle | undefined {
  if (accidental === "natural") {
    return undefined;
  }

  return ACCIDENTAL_ACCENT_STYLES[accidental];
}
