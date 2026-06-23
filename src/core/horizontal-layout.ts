import {
  formatAccidentalSymbol,
  formatJapanesePitchClassName,
} from "./pitch";
import {
  STAFF_LINE_SPACING,
  calculateStaffNotePosition,
  createStaffGeometry,
  getLedgerLineOffsets,
  isStaffLineOffset,
  type StaffGeometry,
} from "./staff-position";
import type { Song, SongNote } from "../schema/song-schema";

export const HORIZONTAL_PIXELS_PER_BEAT = 96;
export const HORIZONTAL_JUDGMENT_LINE_X = 72;
export const HORIZONTAL_NOTE_HEIGHT_RATIO = 0.9;
export const HORIZONTAL_LEDGER_LINE_MIN_WIDTH = 36;
export const HORIZONTAL_VERTICAL_PADDING = 48;

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
  readonly judgmentLineX: number;
  readonly pixelsPerBeat: number;
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
}

export function calculateNoteHorizontalRectangle(
  time: number,
  duration: number,
  judgmentLineX = HORIZONTAL_JUDGMENT_LINE_X,
  pixelsPerBeat = HORIZONTAL_PIXELS_PER_BEAT,
): Pick<SceneRectangle, "x" | "width"> & { readonly rightX: number } {
  const x = judgmentLineX + time * pixelsPerBeat;
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

function calculateBottomLineY(
  song: Song,
  height: number,
  lineSpacing: number,
): number {
  const reference = createStaffGeometry(song.clef, 0, lineSpacing);
  const offsets = song.notes.map(
    (note) =>
      calculateStaffNotePosition(note.spelling, reference).diatonicOffset,
  );
  const minOffset = Math.min(0, ...offsets);
  const maxOffset = Math.max(8, ...offsets);
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
  width: number,
  judgmentLineX: number,
  pixelsPerBeat: number,
): readonly HorizontalBeatLine[] {
  const visibleBeatCount = Math.ceil(
    Math.max(0, width - judgmentLineX) / pixelsPerBeat,
  );

  return Array.from({ length: visibleBeatCount + 1 }, (_, beat) => ({
    beat,
    x: judgmentLineX + beat * pixelsPerBeat,
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
  const judgmentLineX =
    options.judgmentLineX ?? HORIZONTAL_JUDGMENT_LINE_X;
  const lineSpacing = options.lineSpacing ?? STAFF_LINE_SPACING;
  const noteHeight = calculateHorizontalNoteHeight(lineSpacing);
  const staff = createStaffGeometry(
    song.clef,
    calculateBottomLineY(song, options.height, lineSpacing),
    lineSpacing,
  );
  const notes = song.notes.map<HorizontalNoteScene>((note) => {
    const horizontal = calculateNoteHorizontalRectangle(
      note.time,
      note.duration,
      judgmentLineX,
      pixelsPerBeat,
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
    judgmentLineX,
    pixelsPerBeat,
    staff,
    staffLines: staff.lines,
    guideLines: createGuideLines(staff, song.notes),
    beatLines: createBeatLines(options.width, judgmentLineX, pixelsPerBeat),
    notes,
  };
}
