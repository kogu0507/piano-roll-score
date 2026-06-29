import {
  createKeyboardGeometry,
  getPitchRectangle,
  resolveSongPitchRange,
  type KeyboardGeometry,
  type KeyRectangle,
} from "./keyboard-geometry";
import { formatJapanesePitchClassName } from "./pitch";
import type { Song, SongNote } from "../schema/song-schema";

export const PIXELS_PER_BEAT = 64;
export const WHITE_KEY_GUIDE_HEIGHT = 72;
export const BLACK_KEY_GUIDE_HEIGHT = 42;

export interface SceneRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface VerticalNoteScene extends SceneRectangle {
  readonly id: string;
  readonly pitch: number;
  readonly label: string;
  readonly finger?: number;
  readonly hand: SongNote["hand"];
  readonly visible: boolean;
}

export interface VerticalScene {
  readonly width: number;
  readonly height: number;
  readonly playbackGuideY: number;
  readonly judgmentLineY: number;
  readonly displayBeat: number;
  readonly currentBeat: number;
  readonly keyboard: KeyboardGeometry;
  readonly whiteKeys: readonly SceneRectangle[];
  readonly blackKeys: readonly SceneRectangle[];
  readonly notes: readonly VerticalNoteScene[];
  readonly horizontalOffset: number;
}

export interface VerticalSceneOptions {
  readonly width: number;
  readonly height: number;
  readonly whiteKeyWidth: number;
  readonly horizontalOffset: number;
  readonly currentBeat?: number;
  readonly displayBeat?: number;
}

function offsetKey(
  key: KeyRectangle,
  horizontalOffset: number,
  y: number,
  height: number,
): SceneRectangle {
  return {
    x: key.x + horizontalOffset,
    y,
    width: key.width,
    height,
  };
}

export function calculateNoteVerticalRectangle(
  time: number,
  duration: number,
  judgmentLineY: number,
  pixelsPerBeat = PIXELS_PER_BEAT,
  currentBeat = 0,
): Pick<SceneRectangle, "y" | "height"> & { readonly bottomY: number } {
  const bottomY = judgmentLineY - (time - currentBeat) * pixelsPerBeat;
  const height = duration * pixelsPerBeat;

  return {
    y: bottomY - height,
    height,
    bottomY,
  };
}

export function isRectangleVisible(
  rectangle: SceneRectangle,
  canvasWidth: number,
  visibleHeight: number,
): boolean {
  return (
    rectangle.x + rectangle.width > 0 &&
    rectangle.x < canvasWidth &&
    rectangle.y + rectangle.height > 0 &&
    rectangle.y < visibleHeight
  );
}

export function createVerticalScene(
  song: Song,
  options: VerticalSceneOptions,
): VerticalScene {
  const displayBeat = options.displayBeat ?? options.currentBeat ?? 0;
  const keyboard = createKeyboardGeometry(
    resolveSongPitchRange(song),
    options.whiteKeyWidth,
  );
  const playbackGuideY = Math.max(0, options.height - WHITE_KEY_GUIDE_HEIGHT);
  const whiteKeys = keyboard.whiteKeys.map((key) =>
    offsetKey(
      key,
      options.horizontalOffset,
      playbackGuideY,
      WHITE_KEY_GUIDE_HEIGHT,
    ),
  );
  const blackKeys = keyboard.blackKeys.map((key) =>
    offsetKey(
      key,
      options.horizontalOffset,
      playbackGuideY,
      BLACK_KEY_GUIDE_HEIGHT,
    ),
  );
  const notes = song.notes.flatMap<VerticalNoteScene>((note) => {
    const horizontal = getPitchRectangle(keyboard, note.pitch);

    if (horizontal === undefined) {
      return [];
    }

    const vertical = calculateNoteVerticalRectangle(
      note.time,
      note.duration,
      playbackGuideY,
      PIXELS_PER_BEAT,
      displayBeat,
    );
    const rectangle: SceneRectangle = {
      x: horizontal.x + options.horizontalOffset,
      y: vertical.y,
      width: horizontal.width,
      height: vertical.height,
    };

    return [
      {
        ...rectangle,
        id: note.id,
        pitch: note.pitch,
        label: formatJapanesePitchClassName(note.spelling),
        ...(note.finger === undefined ? {} : { finger: note.finger }),
        hand: note.hand,
        visible: isRectangleVisible(
          rectangle,
          options.width,
          playbackGuideY,
        ),
      },
    ];
  });

  return {
    width: options.width,
    height: options.height,
    playbackGuideY,
    judgmentLineY: playbackGuideY,
    displayBeat,
    currentBeat: displayBeat,
    keyboard,
    whiteKeys,
    blackKeys,
    notes,
    horizontalOffset: options.horizontalOffset,
  };
}
