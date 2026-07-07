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
    markerFill: "rgba(40, 112, 178, 0.82)",
    stroke: "#236da8",
    strokeWidth: 2.8,
    bandWidth: 5,
  },
  flat: {
    kind: "flat",
    markerFill: "rgba(116, 75, 166, 0.82)",
    stroke: "#704aa0",
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
