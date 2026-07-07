import type {
  HorizontalNoteScene,
  HorizontalScene,
} from "../core/horizontal-layout";
import { getAccidentalAccentStyle } from "./accidental-accent";
import {
  drawAccidentalAccentSymbol,
  fillAccidentalAccentBand,
} from "./accidental-accent-renderer";
import { drawHandBadge } from "./hand-badge-renderer";
import { createHandBadgeLayout, getHandRenderingStyle } from "./hand-styles";

const PLAYBACK_GUIDE_BAND_WIDTH = 12;
export const HORIZONTAL_NOTE_LABEL_PADDING_X = 6;
const HORIZONTAL_HAND_BADGE_MIN_WIDTH = 42;

export interface HorizontalRenderOptions {
  readonly showNoteNames?: boolean;
  readonly showFingerNumbers?: boolean;
}

export interface HorizontalNoteLabelLayout {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly maxWidth: number;
  readonly textAlign: "left";
  readonly visible: boolean;
}

export function createHorizontalNoteLabelText(
  note: Pick<HorizontalNoteScene, "label" | "finger">,
  options: HorizontalRenderOptions = {},
): string {
  const parts: string[] = [];

  if (options.showNoteNames !== false) {
    parts.push(note.label);
  }

  if (options.showFingerNumbers !== false && note.finger !== undefined) {
    parts.push(String(note.finger));
  }

  return parts.join(" ");
}

export function createHorizontalNoteLabelLayout(
  note: HorizontalNoteScene,
  options: HorizontalRenderOptions = {},
): HorizontalNoteLabelLayout {
  const paddingX = Math.min(
    HORIZONTAL_NOTE_LABEL_PADDING_X,
    Math.max(3, note.width / 4),
  );
  const accentStyle = getAccidentalAccentStyle(note.accidental);
  const handBadgeLayout = createHandBadgeLayout(note, note.hand, {
    minWidth: HORIZONTAL_HAND_BADGE_MIN_WIDTH,
  });
  const labelPaddingX =
    accentStyle === undefined
      ? paddingX
      : Math.max(paddingX, accentStyle.bandWidth + 3);
  const rightReservedWidth = handBadgeLayout.visible
    ? handBadgeLayout.width + paddingX + 2
    : paddingX;
  const text = createHorizontalNoteLabelText(note, options);

  return {
    text,
    x: note.x + labelPaddingX,
    y: note.y + note.height / 2,
    maxWidth: Math.max(1, note.width - labelPaddingX - rightReservedWidth),
    textAlign: "left",
    visible: text.length > 0 && note.width > 8 && note.height > 6,
  };
}

function drawRoundedBlock(
  context: CanvasRenderingContext2D,
  note: HorizontalNoteScene,
  options: HorizontalRenderOptions,
): void {
  const handStyle = getHandRenderingStyle(note.hand);
  const accentStyle = getAccidentalAccentStyle(note.accidental);
  const handBadgeLayout = createHandBadgeLayout(note, note.hand, {
    minWidth: HORIZONTAL_HAND_BADGE_MIN_WIDTH,
  });
  const radius = Math.min(7, note.height / 3, note.width / 4);

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
  context.textBaseline = "middle";
  context.textAlign = "left";
  context.font = `800 ${Math.max(
    10,
    Math.min(13, note.height * 0.68, note.width * 0.22),
  )}px sans-serif`;

  const labelLayout = createHorizontalNoteLabelLayout(note, options);

  if (labelLayout.visible) {
    context.fillText(
      labelLayout.text,
      labelLayout.x,
      labelLayout.y,
      labelLayout.maxWidth,
    );
  }

  context.restore();
}

export function drawHorizontalScene(
  context: CanvasRenderingContext2D,
  scene: HorizontalScene,
  options: HorizontalRenderOptions = {},
): void {
  context.clearRect(0, 0, scene.width, scene.height);
  context.fillStyle = "#f7faf8";
  context.fillRect(0, 0, scene.width, scene.height);

  context.save();
  context.beginPath();
  context.rect(0, 0, scene.width, scene.height);
  context.clip();

  scene.beatLines.forEach((line) => {
    const isMeasure = line.kind === "measure";

    context.strokeStyle =
      isMeasure ? "rgba(37, 99, 115, 0.22)" : "rgba(47, 85, 65, 0.10)";
    context.lineWidth = isMeasure ? 1.6 : 1;
    context.beginPath();
    context.moveTo(line.x, 0);
    context.lineTo(line.x, scene.height);
    context.stroke();
  });

  scene.guideLines
    .filter((line) => !line.isStaffLine)
    .forEach((line) => {
      context.strokeStyle = "rgba(49, 88, 67, 0.10)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, line.y);
      context.lineTo(scene.width, line.y);
      context.stroke();
    });

  scene.staffLines.forEach((line) => {
    context.strokeStyle = "#26332d";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, line.y);
    context.lineTo(scene.width, line.y);
    context.stroke();
  });

  scene.notes
    .filter((note) => note.visible)
    .flatMap((note) => note.ledgerLines)
    .forEach((line) => {
      context.strokeStyle = "#26332d";
      context.lineWidth = 2.5;
      context.beginPath();
      context.moveTo(line.x, line.y);
      context.lineTo(line.x + line.width, line.y);
      context.stroke();
    });

  scene.notes.filter((note) => note.visible).forEach((note) => {
    drawRoundedBlock(context, note, options);
  });

  context.fillStyle = "rgba(37, 99, 115, 0.14)";
  context.fillRect(
    scene.playbackGuideX - PLAYBACK_GUIDE_BAND_WIDTH / 2,
    0,
    PLAYBACK_GUIDE_BAND_WIDTH,
    scene.height,
  );
  context.strokeStyle = "rgba(37, 99, 115, 0.34)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(scene.playbackGuideX, 0);
  context.lineTo(scene.playbackGuideX, scene.height);
  context.stroke();

  context.restore();
}
