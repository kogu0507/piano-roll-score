import type {
  HorizontalNoteScene,
  HorizontalScene,
} from "../core/horizontal-layout";
import { HAND_RENDERING_STYLES } from "./hand-styles";

const PLAYBACK_GUIDE_BAND_WIDTH = 12;

function drawRoundedBlock(
  context: CanvasRenderingContext2D,
  note: HorizontalNoteScene,
): void {
  const colors = HAND_RENDERING_STYLES[note.hand];
  const radius = Math.min(7, note.height / 3, note.width / 4);

  context.beginPath();
  context.roundRect(note.x, note.y, note.width, note.height, radius);
  context.fillStyle = colors.fill;
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = colors.stroke;
  context.stroke();

  context.save();
  context.beginPath();
  context.rect(note.x, note.y, note.width, note.height);
  context.clip();

  context.fillStyle = "#ffffff";
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.font = `800 ${Math.max(11, Math.min(15, note.width * 0.22))}px sans-serif`;

  if (note.width >= 28) {
    context.fillText(
      note.label,
      note.x + note.width / 2,
      note.y + note.height / 2,
      Math.max(1, note.width - 8),
    );
  }

  context.textAlign = "left";
  context.font = "800 9px sans-serif";
  context.fillText(colors.marker, note.x + 4, note.y + note.height / 2);

  if (note.finger !== undefined && note.width >= 44) {
    context.textAlign = "right";
    context.font = "800 10px sans-serif";
    context.fillText(
      String(note.finger),
      note.x + note.width - 4,
      note.y + note.height / 2,
    );
  }

  context.restore();
}

export function drawHorizontalScene(
  context: CanvasRenderingContext2D,
  scene: HorizontalScene,
): void {
  context.clearRect(0, 0, scene.width, scene.height);
  context.fillStyle = "#f7faf8";
  context.fillRect(0, 0, scene.width, scene.height);

  context.save();
  context.beginPath();
  context.rect(0, 0, scene.width, scene.height);
  context.clip();

  scene.beatLines.forEach((line) => {
    context.strokeStyle =
      line.beat === 0 ? "rgba(37, 99, 115, 0.18)" : "rgba(47, 85, 65, 0.10)";
    context.lineWidth = line.beat === 0 ? 1.5 : 1;
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
    drawRoundedBlock(context, note);
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
