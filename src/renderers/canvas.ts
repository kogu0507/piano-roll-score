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
