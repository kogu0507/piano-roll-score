import { describe, expect, it } from "vitest";

import type { HorizontalScene } from "../../src/core/horizontal-layout";
import type { VerticalScene } from "../../src/core/vertical-layout";
import { drawHorizontalScene } from "../../src/renderers/horizontal-renderer";
import { drawVerticalScene } from "../../src/renderers/vertical-renderer";

class RecordingCanvasContext {
  readonly fillTextCalls: string[] = [];
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

  fillText(text: string): void {
    this.fillTextCalls.push(text);
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
    beatLines: [{ beat: 0, x: 72 }],
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
  it("縦表示で音名と指番号を個別に非表示にできる", () => {
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

  it("横表示で音名と指番号を個別に非表示にできる", () => {
    const visibleContext = createRecordingContext();
    drawHorizontalScene(
      asCanvasContext(visibleContext),
      createHorizontalTestScene(),
    );

    expect(visibleContext.fillTextCalls).toContain("note-name");
    expect(visibleContext.fillTextCalls).toContain("4");

    const hiddenContext = createRecordingContext();
    drawHorizontalScene(
      asCanvasContext(hiddenContext),
      createHorizontalTestScene(),
      {
        showNoteNames: false,
        showFingerNumbers: false,
      },
    );

    expect(hiddenContext.fillTextCalls).not.toContain("note-name");
    expect(hiddenContext.fillTextCalls).not.toContain("4");
  });
});
