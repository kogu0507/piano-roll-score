import type { VerticalNoteScene, VerticalScene } from "../core/vertical-layout";

const HAND_COLORS = {
  right: {
    fill: "#e77a55",
    stroke: "#91391e",
    marker: "右",
  },
  left: {
    fill: "#5b8fd8",
    stroke: "#285a9f",
    marker: "左",
  },
  unspecified: {
    fill: "#7a8d82",
    stroke: "#405148",
    marker: "—",
  },
} as const;

export interface CanvasSize {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly devicePixelRatio: number;
}

export function resizeCanvasForDisplay(
  canvas: HTMLCanvasElement,
  size: CanvasSize,
): CanvasRenderingContext2D {
  const pixelWidth = Math.max(
    1,
    Math.round(size.cssWidth * size.devicePixelRatio),
  );
  const pixelHeight = Math.max(
    1,
    Math.round(size.cssHeight * size.devicePixelRatio),
  );

  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth;
  }

  if (canvas.height !== pixelHeight) {
    canvas.height = pixelHeight;
  }

  canvas.dataset.cssWidth = String(Math.round(size.cssWidth));
  canvas.dataset.cssHeight = String(Math.round(size.cssHeight));
  canvas.dataset.dpr = String(size.devicePixelRatio);

  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Canvas 2Dコンテキストを取得できません。");
  }

  context.setTransform(
    size.devicePixelRatio,
    0,
    0,
    size.devicePixelRatio,
    0,
    0,
  );
  return context;
}

function drawNote(
  context: CanvasRenderingContext2D,
  note: VerticalNoteScene,
): void {
  const colors = HAND_COLORS[note.hand];
  const radius = Math.min(8, note.width / 4, note.height / 4);

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
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${Math.max(10, Math.min(15, note.width * 0.28))}px sans-serif`;

  if (note.width >= 18 && note.height >= 18) {
    context.fillText(
      note.label,
      note.x + note.width / 2,
      note.y + note.height / 2,
      Math.max(1, note.width - 4),
    );
  }

  context.textAlign = "left";
  context.textBaseline = "top";
  context.font = "700 9px sans-serif";
  context.fillText(colors.marker, note.x + 3, note.y + 3);

  if (note.finger !== undefined && note.width >= 18 && note.height >= 24) {
    context.textAlign = "right";
    context.textBaseline = "bottom";
    context.font = "700 10px sans-serif";
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

  scene.notes.filter((note) => note.visible).forEach((note) => {
    drawNote(context, note);
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

  context.strokeStyle = "#c23f32";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(0, scene.judgmentLineY);
  context.lineTo(scene.width, scene.judgmentLineY);
  context.stroke();
}
