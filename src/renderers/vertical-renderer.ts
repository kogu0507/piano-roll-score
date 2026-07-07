import type { VerticalNoteScene, VerticalScene } from "../core/vertical-layout";
import { getAccidentalAccentStyle } from "./accidental-accent";
import {
  drawAccidentalAccentSymbol,
  fillAccidentalAccentBand,
} from "./accidental-accent-renderer";
import { drawHandBadge } from "./hand-badge-renderer";
import { createHandBadgeLayout, getHandRenderingStyle } from "./hand-styles";
export { resizeCanvasForDisplay } from "./canvas";

const PLAYBACK_GUIDE_BAND_HEIGHT = 10;

export interface VerticalRenderOptions {
  readonly showNoteNames?: boolean;
  readonly showFingerNumbers?: boolean;
}

function drawNote(
  context: CanvasRenderingContext2D,
  note: VerticalNoteScene,
  options: VerticalRenderOptions,
): void {
  const handStyle = getHandRenderingStyle(note.hand);
  const accentStyle = getAccidentalAccentStyle(note.accidental);
  const handBadgeLayout = createHandBadgeLayout(note, note.hand);
  const radius = Math.min(8, note.width / 4, note.height / 4);

  context.beginPath();
  context.roundRect(note.x, note.y, note.width, note.height, radius);
  context.fillStyle = handStyle.fill;
  context.fill();

  if (accentStyle !== undefined) {
    fillAccidentalAccentBand(context, note, radius, accentStyle);
  }

  context.beginPath();
  context.roundRect(note.x, note.y, note.width, note.height, radius);
  context.lineWidth = accentStyle?.strokeWidth ?? 2;
  context.strokeStyle = accentStyle?.stroke ?? handStyle.stroke;
  context.stroke();

  context.save();
  context.beginPath();
  context.roundRect(note.x, note.y, note.width, note.height, radius);
  context.clip();
  if (accentStyle !== undefined) {
    drawAccidentalAccentSymbol(context, note, accentStyle);
  }

  drawHandBadge(context, handBadgeLayout, handStyle);

  context.fillStyle = handStyle.labelText;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${Math.max(10, Math.min(15, note.width * 0.28))}px sans-serif`;

  if (options.showNoteNames !== false && note.width >= 18 && note.height >= 18) {
    context.fillText(
      note.label,
      note.x + note.width / 2,
      note.y + note.height / 2,
      Math.max(1, note.width - 4),
    );
  }

  if (
    options.showFingerNumbers !== false &&
    note.finger !== undefined &&
    note.width >= 18 &&
    note.height >= 24
  ) {
    context.textAlign = "right";
    context.textBaseline = "bottom";
    context.font = "700 10px sans-serif";
    context.fillStyle = handStyle.labelText;
    context.fillText(
      String(note.finger),
      note.x + note.width - 3,
      note.y + note.height - 3,
    );
  }

  context.restore();
}

export function drawVerticalScene(
  context: CanvasRenderingContext2D,
  scene: VerticalScene,
  options: VerticalRenderOptions = {},
): void {
  context.clearRect(0, 0, scene.width, scene.height);
  context.fillStyle = "#f2f7f4";
  context.fillRect(0, 0, scene.width, scene.height);

  context.save();
  context.beginPath();
  context.rect(0, 0, scene.width, scene.judgmentLineY);
  context.clip();

  scene.whiteKeys.forEach((key) => {
    context.strokeStyle = "rgba(49, 88, 67, 0.15)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(key.x, 0);
    context.lineTo(key.x, scene.judgmentLineY);
    context.stroke();
  });

  scene.blackKeys.forEach((key) => {
    context.fillStyle = "rgba(30, 43, 36, 0.06)";
    context.fillRect(key.x, 0, key.width, scene.judgmentLineY);
  });

  scene.beatLines.forEach((line) => {
    const isMeasure = line.kind === "measure";

    context.strokeStyle = isMeasure
      ? "rgba(37, 99, 115, 0.22)"
      : "rgba(47, 85, 65, 0.11)";
    context.lineWidth = isMeasure ? 1.6 : 1;
    context.beginPath();
    context.moveTo(0, line.y);
    context.lineTo(scene.width, line.y);
    context.stroke();
  });

  scene.notes.filter((note) => note.visible).forEach((note) => {
    drawNote(context, note, options);
  });
  context.restore();

  scene.whiteKeys.forEach((key) => {
    context.fillStyle = "#fffef9";
    context.fillRect(key.x, key.y, key.width, key.height);
    context.strokeStyle = "#555e59";
    context.lineWidth = 1;
    context.strokeRect(key.x, key.y, key.width, key.height);
  });

  scene.blackKeys.forEach((key) => {
    context.fillStyle = "#1d2521";
    context.fillRect(key.x, key.y, key.width, key.height);
    context.strokeStyle = "#050706";
    context.lineWidth = 1;
    context.strokeRect(key.x, key.y, key.width, key.height);
  });

  context.fillStyle = "rgba(37, 99, 115, 0.14)";
  context.fillRect(
    0,
    scene.playbackGuideY - PLAYBACK_GUIDE_BAND_HEIGHT / 2,
    scene.width,
    PLAYBACK_GUIDE_BAND_HEIGHT,
  );
  context.strokeStyle = "rgba(37, 99, 115, 0.34)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(0, scene.playbackGuideY);
  context.lineTo(scene.width, scene.playbackGuideY);
  context.stroke();
}
