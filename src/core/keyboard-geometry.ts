import type { Song } from "../schema/song-schema";

export const PIANO_MIN_MIDI = 21;
export const PIANO_MAX_MIDI = 108;
export const BLACK_KEY_WIDTH_RATIO = 0.62;
export const MIN_WHITE_KEY_WIDTH = 16;
export const MAX_WHITE_KEY_WIDTH = 320;

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export interface PitchRange {
  readonly minPitch: number;
  readonly maxPitch: number;
}

export interface KeyRectangle {
  readonly pitch: number;
  readonly x: number;
  readonly width: number;
}

export interface KeyboardGeometry {
  readonly sourceRange: PitchRange;
  readonly normalizedRange: PitchRange;
  readonly whiteKeyWidth: number;
  readonly blackKeyWidth: number;
  readonly totalWidth: number;
  readonly whiteKeys: readonly KeyRectangle[];
  readonly blackKeys: readonly KeyRectangle[];
}

export function isBlackKey(pitch: number): boolean {
  return BLACK_PITCH_CLASSES.has(((pitch % 12) + 12) % 12);
}

export function isWhiteKey(pitch: number): boolean {
  return !isBlackKey(pitch);
}

export function getWhiteKeyOrdinal(pitch: number): number {
  let ordinal = -1;

  for (let midi = 0; midi <= pitch; midi += 1) {
    if (isWhiteKey(midi)) {
      ordinal += 1;
    }
  }

  return ordinal;
}

function previousWhiteKey(pitch: number): number {
  let candidate = pitch;

  while (candidate >= PIANO_MIN_MIDI && isBlackKey(candidate)) {
    candidate -= 1;
  }

  return candidate;
}

function nextWhiteKey(pitch: number): number {
  let candidate = pitch;

  while (candidate <= PIANO_MAX_MIDI && isBlackKey(candidate)) {
    candidate += 1;
  }

  return candidate;
}

export function resolveSongPitchRange(song: Song): PitchRange {
  if (song.displayRange.mode === "fixed") {
    return {
      minPitch: song.displayRange.minPitch,
      maxPitch: song.displayRange.maxPitch,
    };
  }

  const pitches = song.notes.map((note) => note.pitch);
  return {
    minPitch: Math.min(...pitches),
    maxPitch: Math.max(...pitches),
  };
}

export function normalizeRangeToWhiteKeys(range: PitchRange): PitchRange {
  return {
    minPitch: previousWhiteKey(range.minPitch),
    maxPitch: nextWhiteKey(range.maxPitch),
  };
}

export function createKeyboardGeometry(
  range: PitchRange,
  whiteKeyWidth: number,
): KeyboardGeometry {
  const normalizedRange = normalizeRangeToWhiteKeys(range);
  const whiteKeys: KeyRectangle[] = [];
  const blackKeys: KeyRectangle[] = [];

  for (
    let pitch = normalizedRange.minPitch;
    pitch <= normalizedRange.maxPitch;
    pitch += 1
  ) {
    if (isWhiteKey(pitch)) {
      whiteKeys.push({
        pitch,
        x: whiteKeys.length * whiteKeyWidth,
        width: whiteKeyWidth,
      });
    }
  }

  const blackKeyWidth = whiteKeyWidth * BLACK_KEY_WIDTH_RATIO;

  for (let index = 0; index < whiteKeys.length - 1; index += 1) {
    const leftWhiteKey = whiteKeys[index];
    const rightWhiteKey = whiteKeys[index + 1];

    if (
      leftWhiteKey === undefined ||
      rightWhiteKey === undefined ||
      rightWhiteKey.pitch - leftWhiteKey.pitch !== 2
    ) {
      continue;
    }

    blackKeys.push({
      pitch: leftWhiteKey.pitch + 1,
      x: rightWhiteKey.x - blackKeyWidth / 2,
      width: blackKeyWidth,
    });
  }

  return {
    sourceRange: range,
    normalizedRange,
    whiteKeyWidth,
    blackKeyWidth,
    totalWidth: whiteKeys.length * whiteKeyWidth,
    whiteKeys,
    blackKeys,
  };
}

export function getPitchRectangle(
  geometry: KeyboardGeometry,
  pitch: number,
): KeyRectangle | undefined {
  const source = isBlackKey(pitch)
    ? geometry.blackKeys
    : geometry.whiteKeys;
  const key = source.find((candidate) => candidate.pitch === pitch);

  if (key === undefined) {
    return undefined;
  }

  if (isBlackKey(pitch)) {
    return key;
  }

  const margin = Math.min(geometry.whiteKeyWidth * 0.08, 8);
  return {
    pitch,
    x: key.x + margin,
    width: Math.max(1, key.width - margin * 2),
  };
}

export function normalizeWhiteKeyWidth(value: number): number {
  return Math.min(
    MAX_WHITE_KEY_WIDTH,
    Math.max(MIN_WHITE_KEY_WIDTH, Math.round(value)),
  );
}

export function fitWhiteKeyWidth(
  canvasWidth: number,
  whiteKeyCount: number,
): number {
  if (whiteKeyCount <= 0) {
    return MIN_WHITE_KEY_WIDTH;
  }

  return normalizeWhiteKeyWidth(canvasWidth / whiteKeyCount);
}

export function calculateCenteredOffset(
  canvasWidth: number,
  contentWidth: number,
): number {
  return Math.round((canvasWidth - contentWidth) / 2);
}

export function preserveContentCenterOffset(
  previousOffset: number,
  previousContentWidth: number,
  nextContentWidth: number,
): number {
  const center = previousOffset + previousContentWidth / 2;
  return Math.round(center - nextContentWidth / 2);
}

export function getHorizontalOffsetRange(
  canvasWidth: number,
  contentWidth: number,
): { readonly min: number; readonly max: number } {
  return {
    min: Math.round(-contentWidth),
    max: Math.round(canvasWidth),
  };
}

export function clampHorizontalOffset(
  offset: number,
  canvasWidth: number,
  contentWidth: number,
): number {
  const range = getHorizontalOffsetRange(canvasWidth, contentWidth);
  return Math.min(range.max, Math.max(range.min, Math.round(offset)));
}
