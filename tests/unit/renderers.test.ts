import { describe, expect, it } from "vitest";

import type { HorizontalScene } from "../../src/core/horizontal-layout";
import type { VerticalScene } from "../../src/core/vertical-layout";
import {
  createHorizontalNoteLabelLayout,
  drawHorizontalScene,
} from "../../src/renderers/horizontal-renderer";
import { drawVerticalScene } from "../../src/renderers/vertical-renderer";

interface FillTextCallRecord {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly maxWidth: number | undefined;
  readonly textAlign: CanvasTextAlign;
  readonly font: string;
}

class RecordingCanvasContext {
  readonly fillTextCalls: string[] = [];
  readonly fillTextCallRecords: FillTextCallRecord[] = [];
  fillStyle: string | CanvasGradient | CanvasPattern = "#000000";
  strokeStyle: string | CanvasGradient | CanvasPattern = "#000000";
  lineWidth = 1;
  textAlign: CanvasTextAlign = "start";
  textBaseline: CanvasTextBaseline = "alphabetic";
  font = "10px sans-serif";

  beginPath(): void {}
  clearRect(): void {}
  clip(): void {}
  fill(): void {}
  fillRect(): void {}
  lineTo(): void {}
  moveTo(): void {}
  rect(): void {}
  restore(): void {}
  roundRect(): void {}
  save(): void {}
  stroke(): void {}
  strokeRect(): void {}

  fillText(text: string, x = 0, y = 0, maxWidth?: number): void {
    this.fillTextCalls.push(text);
    this.fillTextCallRecords.push({
      text,
      x,
      y,
      maxWidth,
      textAlign: this.textAlign,
      font: this.font,
    });
  }
}

function createRecordingContext(): RecordingCanvasContext {
  return new RecordingCanvasContext();
}

function asCanvasContext(
  context: RecordingCanvasContext,
): CanvasRenderingContext2D {
  return context as unknown as CanvasRenderingContext2D;
}

function createVerticalTestScene(): VerticalScene {
  return {
    width: 240,
    height: 180,
    playbackGuideY: 130,
    judgmentLineY: 130,
    keyboardGuideHeightScale: 1,
    whiteKeyGuideHeight: 50,
    blackKeyGuideHeight: 28,
    pixelsPerBeat: 64,
    displayBeat: 0,
    currentBeat: 0,
    keyboard: {} as VerticalScene["keyboard"],
    whiteKeys: [{ x: 0, y: 130, width: 40, height: 50 }],
    blackKeys: [{ x: 26, y: 130, width: 20, height: 28 }],
    beatLines: [
      { beat: 0, y: 130, kind: "measure" },
      { beat: 1, y: 66, kind: "beat" },
    ],
    horizontalOffset: 0,
    notes: [
      {
        id: "note",
        pitch: 60,
        label: "note-name",
        finger: 4,
        hand: "right",
        visible: true,
        x: 20,
        y: 30,
        width: 48,
        height: 64,
      },
    ],
  };
}

function createHorizontalTestScene(): HorizontalScene {
  return {
    width: 260,
    height: 180,
    playbackGuideX: 72,
    judgmentLineX: 72,
    pixelsPerBeat: 96,
    displayBeat: 0,
    currentBeat: 0,
    verticalOffset: 0,
    staff: {} as HorizontalScene["staff"],
    staffLines: [{ indexFromBottom: 0, diatonicOffset: 0, y: 120 }],
    guideLines: [],
    beatLines: [{ beat: 0, x: 72, kind: "measure" }],
    notes: [
      {
        id: "note",
        label: "note-name",
        accidentalSymbol: "",
        finger: 4,
        hand: "right",
        staffY: 90,
        diatonicOffset: 2,
        visible: true,
        ledgerLines: [],
        x: 110,
        y: 78,
        width: 64,
        height: 18,
      },
    ],
  };
}

describe("Canvas note text rendering", () => {
  it("vertical labels keep independent note-name and finger visibility", () => {
    const visibleContext = createRecordingContext();
    drawVerticalScene(asCanvasContext(visibleContext), createVerticalTestScene());

    expect(visibleContext.fillTextCalls).toContain("note-name");
    expect(visibleContext.fillTextCalls).toContain("4");

    const hiddenContext = createRecordingContext();
    drawVerticalScene(asCanvasContext(hiddenContext), createVerticalTestScene(), {
      showNoteNames: false,
      showFingerNumbers: false,
    });

    expect(hiddenContext.fillTextCalls).not.toContain("note-name");
    expect(hiddenContext.fillTextCalls).not.toContain("4");
  });

  it("horizontal score labels are drawn as one left-aligned label", () => {
    const scene = createHorizontalTestScene();
    const visibleContext = createRecordingContext();
    drawHorizontalScene(asCanvasContext(visibleContext), scene);

    expect(visibleContext.fillTextCalls).toContain("note-name 4");
    const labelCall = visibleContext.fillTextCallRecords.find(
      (call) => call.text === "note-name 4",
    );
    const expectedLayout = createHorizontalNoteLabelLayout(scene.notes[0]);

    expect(labelCall?.textAlign).toBe("left");
    expect(labelCall?.x).toBeCloseTo(expectedLayout.x);
    expect(labelCall?.x).toBeGreaterThan(scene.notes[0].x);
    expect(labelCall?.x).toBeLessThan(scene.notes[0].x + 12);
    expect(labelCall?.maxWidth).toBeCloseTo(expectedLayout.maxWidth);

    const hiddenContext = createRecordingContext();
    drawHorizontalScene(asCanvasContext(hiddenContext), scene, {
      showNoteNames: false,
      showFingerNumbers: false,
    });

    expect(hiddenContext.fillTextCalls).not.toContain("note-name");
    expect(hiddenContext.fillTextCalls).not.toContain("4");
    expect(hiddenContext.fillTextCalls).not.toContain("note-name 4");
  });

  it("horizontal score labels reflect note-name and finger-number toggles", () => {
    const scene = createHorizontalTestScene();

    const fingerOnlyContext = createRecordingContext();
    drawHorizontalScene(asCanvasContext(fingerOnlyContext), scene, {
      showNoteNames: false,
      showFingerNumbers: true,
    });

    expect(fingerOnlyContext.fillTextCalls).toContain("4");
    expect(fingerOnlyContext.fillTextCalls).not.toContain("note-name");

    const noteNameOnlyContext = createRecordingContext();
    drawHorizontalScene(asCanvasContext(noteNameOnlyContext), scene, {
      showNoteNames: true,
      showFingerNumbers: false,
    });

    expect(noteNameOnlyContext.fillTextCalls).toContain("note-name");
    expect(noteNameOnlyContext.fillTextCalls).not.toContain("4");

    const hiddenContext = createRecordingContext();
    drawHorizontalScene(asCanvasContext(hiddenContext), scene, {
      showNoteNames: false,
      showFingerNumbers: false,
    });

    expect(hiddenContext.fillTextCalls).not.toContain("note-name");
    expect(hiddenContext.fillTextCalls).not.toContain("4");
    expect(hiddenContext.fillTextCalls.length).toBe(0);
  });
});
