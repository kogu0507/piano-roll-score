import type { SongNote } from "../schema/song-schema";

export type NoteHand = SongNote["hand"];

export interface HandRenderingStyle {
  readonly fill: string;
  readonly stroke: string;
  readonly labelText: string;
  readonly marker: string;
  readonly badgeFill: string;
  readonly badgeStroke: string;
  readonly badgeText: string;
}

export interface NoteBlockRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface HandBadgeLayout {
  readonly visible: boolean;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface HandBadgeLayoutOptions {
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly edgePadding?: number;
}

const NOTE_BLOCK_FILL = "#f7f8f5";
const NOTE_LABEL_TEXT = "#24332b";
const DEFAULT_BADGE_MIN_WIDTH = 30;
const DEFAULT_BADGE_MIN_HEIGHT = 14;
const DEFAULT_BADGE_EDGE_PADDING = 3;

export const HAND_RENDERING_STYLES: Readonly<
  Record<NoteHand, HandRenderingStyle>
> = {
  right: {
    fill: NOTE_BLOCK_FILL,
    stroke: "#c3b196",
    labelText: NOTE_LABEL_TEXT,
    marker: "右",
    badgeFill: "#fff4df",
    badgeStroke: "#c99a55",
    badgeText: "#5c421f",
  },
  left: {
    fill: NOTE_BLOCK_FILL,
    stroke: "#a7b6c8",
    labelText: NOTE_LABEL_TEXT,
    marker: "左",
    badgeFill: "#eef4ff",
    badgeStroke: "#8aa2c0",
    badgeText: "#334968",
  },
  unspecified: {
    fill: NOTE_BLOCK_FILL,
    stroke: "#aeb7b0",
    labelText: NOTE_LABEL_TEXT,
    marker: "—",
    badgeFill: "#eef1ee",
    badgeStroke: "#a6afa9",
    badgeText: "#4a554f",
  },
} as const;

export function getHandRenderingStyle(hand: NoteHand): HandRenderingStyle {
  return HAND_RENDERING_STYLES[hand];
}

export function createHandBadgeLayout(
  rect: NoteBlockRect,
  hand: NoteHand,
  options: HandBadgeLayoutOptions = {},
): HandBadgeLayout {
  const minWidth = options.minWidth ?? DEFAULT_BADGE_MIN_WIDTH;
  const minHeight = options.minHeight ?? DEFAULT_BADGE_MIN_HEIGHT;
  const edgePadding = options.edgePadding ?? DEFAULT_BADGE_EDGE_PADDING;
  const style = getHandRenderingStyle(hand);
  const visible = rect.width >= minWidth && rect.height >= minHeight;

  if (!visible) {
    return {
      visible: false,
      text: style.marker,
      x: rect.x,
      y: rect.y,
      width: 0,
      height: 0,
    };
  }

  const height = Math.min(13, Math.max(10, rect.height - edgePadding * 2));
  const width = Math.min(18, Math.max(14, height + 3));

  return {
    visible: true,
    text: style.marker,
    x: rect.x + rect.width - width - edgePadding,
    y: rect.y + edgePadding,
    width,
    height,
  };
}
