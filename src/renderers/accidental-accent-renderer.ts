import type { AccidentalAccentStyle } from "./accidental-accent";
import type { NoteBlockRect } from "./hand-styles";

export function fillAccidentalAccentBand(
  context: CanvasRenderingContext2D,
  rect: NoteBlockRect,
  radius: number,
  accentStyle: AccidentalAccentStyle,
): void {
  context.save();
  context.beginPath();
  context.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
  context.clip();
  context.fillStyle = accentStyle.markerFill;
  context.fillRect(
    rect.x,
    rect.y,
    Math.min(accentStyle.bandWidth, rect.width),
    rect.height,
  );
  context.restore();
}

export function drawAccidentalAccentSymbol(
  context: CanvasRenderingContext2D,
  rect: NoteBlockRect,
  accentStyle: AccidentalAccentStyle,
): void {
  const markerWidth = Math.min(accentStyle.bandWidth, rect.width);

  if (markerWidth < 6 || rect.height < 14 || rect.width < 12) {
    return;
  }

  context.fillStyle = accentStyle.symbolFill;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.font = `900 ${Math.min(11, Math.max(9, rect.height * 0.42))}px sans-serif`;
  context.fillText(
    accentStyle.symbol,
    rect.x + markerWidth / 2,
    rect.y + 1.5,
    markerWidth + 2,
  );
}
