import {
  formatAccidentalSymbol,
  formatJapanesePitchClassName,
  type Accidental,
} from "./pitch";
import {
  STAFF_LINE_SPACING,
  calculateStaffNotePosition,
  createStaffGeometry,
  getLedgerLineOffsets,
  isStaffLineOffset,
  type StaffGeometry,
} from "./staff-position";
import {
  createBeatGridLines,
  type BeatGridLineKind,
} from "./beat-grid";
import { calculateNotePlaybackTime } from "./song-timing";
import type { Song, SongNote } from "../schema/song-schema";

export const HORIZONTAL_PIXELS_PER_BEAT = 96;
export const HORIZONTAL_JUDGMENT_LINE_X = 72;
export const HORIZONTAL_PLAYBACK_GUIDE_X = HORIZONTAL_JUDGMENT_LINE_X;
export const HORIZONTAL_NOTE_HEIGHT_RATIO = 0.9;
export const HORIZONTAL_LEDGER_LINE_MIN_WIDTH = 36;
export const HORIZONTAL_VERTICAL_PADDING = 48;
export const MIN_HORIZONTAL_LINE_SPACING = 10;
export const MAX_HORIZONTAL_LINE_SPACING = 40;

export interface SceneRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface HorizontalStaffLine {
  readonly indexFromBottom: number;
  readonly diatonicOffset: number;
  readonly y: number;
}

export interface HorizontalGuideLine {
  readonly diatonicOffset: number;
  readonly y: number;
  readonly isStaffLine: boolean;
}

export interface HorizontalBeatLine {
  readonly beat: number;
  readonly x: number;
  readonly kind: BeatGridLineKind;
}

export interface HorizontalLedgerLine {
  readonly noteId: string;
  readonly diatonicOffset: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

export interface HorizontalNoteScene extends SceneRectangle {
  readonly id: string;
  readonly label: string;
  readonly accidental: Accidental;
  readonly accidentalSymbol: string;
  readonly finger?: number;
  readonly hand: SongNote["hand"];
  readonly staffY: number;
  readonly diatonicOffset: number;
  readonly visible: boolean;
  readonly ledgerLines: readonly HorizontalLedgerLine[];
}

export interface HorizontalScene {
  readonly width: number;
  readonly height: number;
  readonly playbackGuideX: number;
  readonly judgmentLineX: number;
  readonly pixelsPerBeat: number;
  readonly displayBeat: number;
  readonly currentBeat: number;
  readonly verticalOffset: number;
  readonly staff: StaffGeometry;
  readonly staffLines: readonly HorizontalStaffLine[];
  readonly guideLines: readonly HorizontalGuideLine[];
  readonly beatLines: readonly HorizontalBeatLine[];
  readonly notes: readonly HorizontalNoteScene[];
}

export interface HorizontalSceneOptions {
  readonly width: number;
  readonly height: number;
  readonly pixelsPerBeat?: number;
  readonly judgmentLineX?: number;
  readonly lineSpacing?: number;
  readonly verticalOffset?: number;
  readonly currentBeat?: number;
  readonly displayBeat?: number;
}

export interface HorizontalDiatonicOffsetRange {
  readonly minOffset: number;
  readonly maxOffset: number;
}

export function calculateNoteHorizontalRectangle(
  time: number,
  duration: number,
  judgmentLineX = HORIZONTAL_JUDGMENT_LINE_X,
  pixelsPerBeat = HORIZONTAL_PIXELS_PER_BEAT,
  currentBeat = 0,
): Pick<SceneRectangle, "x" | "width"> & { readonly rightX: number } {
  const x = judgmentLineX + (time - currentBeat) * pixelsPerBeat;
  const width = duration * pixelsPerBeat;

  return {
    x,
    width,
    rightX: x + width,
  };
}

export function isHorizontalRectangleVisible(
  rectangle: SceneRectangle,
  canvasWidth: number,
  canvasHeight: number,
): boolean {
  return (
    rectangle.x + rectangle.width > 0 &&
    rectangle.x < canvasWidth &&
    rectangle.y + rectangle.height > 0 &&
    rectangle.y < canvasHeight
  );
}

export function calculateHorizontalNoteHeight(lineSpacing: number): number {
  return lineSpacing * HORIZONTAL_NOTE_HEIGHT_RATIO;
}

export function normalizeHorizontalLineSpacing(lineSpacing: number): number {
  if (!Number.isFinite(lineSpacing)) {
    return STAFF_LINE_SPACING;
  }

  return Math.min(
    MAX_HORIZONTAL_LINE_SPACING,
    Math.max(MIN_HORIZONTAL_LINE_SPACING, Math.round(lineSpacing)),
  );
}

export function calculateHorizontalDiatonicOffsetRange(
  song: Song,
  lineSpacing: number,
): HorizontalDiatonicOffsetRange {
  const reference = createStaffGeometry(song.clef, 0, lineSpacing);
  const offsets = song.notes.map(
    (note) =>
      calculateStaffNotePosition(note.spelling, reference).diatonicOffset,
  );

  return {
    minOffset: Math.min(0, ...offsets),
    maxOffset: Math.max(8, ...offsets),
  };
}

export function calculateHorizontalContentHeight(
  song: Song,
  lineSpacing: number,
): number {
  const normalizedSpacing = normalizeHorizontalLineSpacing(lineSpacing);
  const range = calculateHorizontalDiatonicOffsetRange(
    song,
    normalizedSpacing,
  );

  return (
    ((range.maxOffset - range.minOffset) * normalizedSpacing) / 2 +
    calculateHorizontalNoteHeight(normalizedSpacing)
  );
}

export function calculateFittedHorizontalLineSpacing(
  song: Song,
  height: number,
): number {
  const range = calculateHorizontalDiatonicOffsetRange(
    song,
    STAFF_LINE_SPACING,
  );
  const availableHeight = Math.max(
    MIN_HORIZONTAL_LINE_SPACING,
    height - HORIZONTAL_VERTICAL_PADDING * 2,
  );
  const contentRatio =
    (range.maxOffset - range.minOffset) / 2 + HORIZONTAL_NOTE_HEIGHT_RATIO;
  const fittedSpacing =
    contentRatio <= 0
      ? STAFF_LINE_SPACING
      : availableHeight / contentRatio;

  return normalizeHorizontalLineSpacing(Math.floor(fittedSpacing));
}

function calculateBottomLineY(
  song: Song,
  height: number,
  lineSpacing: number,
): number {
  const { minOffset, maxOffset } = calculateHorizontalDiatonicOffsetRange(
    song,
    lineSpacing,
  );
  const halfStep = lineSpacing / 2;
  const centerY = height * 0.52;
  let bottomLineY = centerY + ((minOffset + maxOffset) / 2) * halfStep;
  const topContentY = bottomLineY - maxOffset * halfStep;
  const bottomContentY = bottomLineY - minOffset * halfStep;

  if (topContentY < HORIZONTAL_VERTICAL_PADDING) {
    bottomLineY += HORIZONTAL_VERTICAL_PADDING - topContentY;
  }

  if (bottomContentY > height - HORIZONTAL_VERTICAL_PADDING) {
    bottomLineY -= bottomContentY - (height - HORIZONTAL_VERTICAL_PADDING);
  }

  return Math.round(bottomLineY);
}

function createGuideLines(
  geometry: StaffGeometry,
  notes: readonly SongNote[],
): readonly HorizontalGuideLine[] {
  const noteOffsets = notes.map(
    (note) => calculateStaffNotePosition(note.spelling, geometry).diatonicOffset,
  );
  const minOffset = Math.floor(Math.min(0, ...noteOffsets) - 2);
  const maxOffset = Math.ceil(Math.max(8, ...noteOffsets) + 2);
  const guideLines: HorizontalGuideLine[] = [];

  for (let offset = minOffset; offset <= maxOffset; offset += 1) {
    guideLines.push({
      diatonicOffset: offset,
      y: geometry.bottomLineY - offset * geometry.halfStep,
      isStaffLine: isStaffLineOffset(offset),
    });
  }

  return guideLines;
}

function createBeatLines(
  song: Song,
  width: number,
  judgmentLineX: number,
  pixelsPerBeat: number,
  currentBeat: number,
): readonly HorizontalBeatLine[] {
  return createBeatGridLines({
    beatsPerMeasure: song.timeSignature.numerator,
    displayBeat: currentBeat,
    pixelsPerBeat,
    originPosition: judgmentLineX,
    viewportStart: 0,
    viewportEnd: width,
    direction: 1,
    pickupBeats: song.pickupBeats,
  }).map((line) => ({
    beat: line.beat,
    x: line.position,
    kind: line.kind,
  }));
}

function createLedgerLines(
  noteId: string,
  diatonicOffset: number,
  noteX: number,
  noteWidth: number,
  geometry: StaffGeometry,
): readonly HorizontalLedgerLine[] {
  return getLedgerLineOffsets(diatonicOffset).map((offset) => {
    const width = Math.max(
      HORIZONTAL_LEDGER_LINE_MIN_WIDTH,
      noteWidth + 18,
    );

    return {
      noteId,
      diatonicOffset: offset,
      x: noteX + noteWidth / 2 - width / 2,
      y: geometry.bottomLineY - offset * geometry.halfStep,
      width,
    };
  });
}

export function createHorizontalScene(
  song: Song,
  options: HorizontalSceneOptions,
): HorizontalScene {
  const pixelsPerBeat = options.pixelsPerBeat ?? HORIZONTAL_PIXELS_PER_BEAT;
  const playbackGuideX =
    options.judgmentLineX ?? HORIZONTAL_JUDGMENT_LINE_X;
  const lineSpacing = normalizeHorizontalLineSpacing(
    options.lineSpacing ?? STAFF_LINE_SPACING,
  );
  const verticalOffset = Math.round(options.verticalOffset ?? 0);
  const displayBeat = options.displayBeat ?? options.currentBeat ?? 0;
  const noteHeight = calculateHorizontalNoteHeight(lineSpacing);
  const staff = createStaffGeometry(
    song.clef,
    calculateBottomLineY(song, options.height, lineSpacing) + verticalOffset,
    lineSpacing,
  );
  const notes = song.notes.map<HorizontalNoteScene>((note) => {
    const horizontal = calculateNoteHorizontalRectangle(
      calculateNotePlaybackTime(note, song.pickupBeats),
      note.duration,
      playbackGuideX,
      pixelsPerBeat,
      displayBeat,
    );
    const staffPosition = calculateStaffNotePosition(note.spelling, staff);
    const rectangle: SceneRectangle = {
      x: horizontal.x,
      y: staffPosition.y - noteHeight / 2,
      width: horizontal.width,
      height: noteHeight,
    };
    const ledgerLines = createLedgerLines(
      note.id,
      staffPosition.diatonicOffset,
      rectangle.x,
      rectangle.width,
      staff,
    );

    return {
      ...rectangle,
      id: note.id,
      label: formatJapanesePitchClassName(note.spelling),
      accidental: note.spelling.accidental,
      accidentalSymbol: formatAccidentalSymbol(note.spelling.accidental),
      ...(note.finger === undefined ? {} : { finger: note.finger }),
      hand: note.hand,
      staffY: staffPosition.y,
      diatonicOffset: staffPosition.diatonicOffset,
      visible: isHorizontalRectangleVisible(
        rectangle,
        options.width,
        options.height,
      ),
      ledgerLines,
    };
  });

  return {
    width: options.width,
    height: options.height,
    playbackGuideX,
    judgmentLineX: playbackGuideX,
    pixelsPerBeat,
    displayBeat,
    currentBeat: displayBeat,
    verticalOffset,
    staff,
    staffLines: staff.lines,
    guideLines: createGuideLines(staff, song.notes),
    beatLines: createBeatLines(
      song,
      options.width,
      playbackGuideX,
      pixelsPerBeat,
      displayBeat,
    ),
    notes,
  };
}
