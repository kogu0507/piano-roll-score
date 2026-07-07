import type { HandBadgeLayout, HandRenderingStyle } from "./hand-styles";

export function drawHandBadge(
  context: CanvasRenderingContext2D,
  layout: HandBadgeLayout,
  style: HandRenderingStyle,
): void {
  if (!layout.visible) {
    return;
  }

  const radius = Math.min(4, layout.width / 4, layout.height / 3);

  context.beginPath();
  context.roundRect(layout.x, layout.y, layout.width, layout.height, radius);
  context.fillStyle = style.badgeFill;
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = style.badgeStroke;
  context.stroke();

  context.fillStyle = style.badgeText;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "800 9px sans-serif";
  context.fillText(
    layout.text,
    layout.x + layout.width / 2,
    layout.y + layout.height / 2 + 0.4,
    Math.max(1, layout.width - 2),
  );
}
