import { STAFF_LINE_SPACING } from "../core/staff-position";
import {
  calculateDisplayBeat,
  formatBeat,
  formatPlaybackRate,
} from "../core/timeline";
import type { PlaybackState } from "../core/timeline";
import {
  DEFAULT_DISPLAY_TEXT_SETTINGS,
  type DisplayTextSettings,
  type HorizontalViewSettings,
} from "../core/app-settings";
import {
  HORIZONTAL_PIXELS_PER_BEAT,
  MAX_HORIZONTAL_LINE_SPACING,
  MIN_HORIZONTAL_LINE_SPACING,
  calculateFittedHorizontalLineSpacing,
  createHorizontalScene,
  normalizeHorizontalLineSpacing,
} from "../core/horizontal-layout";
import {
  percentToTimeScale,
  timeScaleToPercent,
} from "../core/time-scale";
import type { PlaybackController } from "../playback/playback-controller";
import { resizeCanvasForDisplay } from "../renderers/canvas";
import {
  createHorizontalNoteLabelLayout,
  drawHorizontalScene,
} from "../renderers/horizontal-renderer";
import { mountPlaybackControls } from "./playback-controls";
import { createPracticeMenu } from "./practice-menu";
import type { Song } from "../types/song";

interface HorizontalScreenState {
  lineSpacing: number;
  verticalOffset: number;
  timeScale: number;
}

export interface HorizontalScreenOptions {
  readonly initialSettings?: HorizontalViewSettings;
  readonly displayTextSettings?: DisplayTextSettings;
  readonly onSettingsChange?: (settings: HorizontalViewSettings) => void;
  readonly onDisplayTextSettingsChange?: (
    settings: DisplayTextSettings,
  ) => void;
  readonly onPlaybackSettingsChange?: (state: PlaybackState) => void;
}

function createTextElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className: string,
  text: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createButton(text: string, className = "button"): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  return button;
}

export function mountHorizontalScreen(
  root: HTMLElement,
  song: Song,
  returnToLoadScreen: () => void,
  playbackController: PlaybackController,
  switchToVertical?: () => void,
  screenOptions: HorizontalScreenOptions = {},
): void {
  const main = document.createElement("main");
  const header = document.createElement("header");
  const navigation = document.createElement("div");
  const adjustmentPanel = document.createElement("section");
  const adjustmentHeader = document.createElement("div");
  const closeAdjustmentButton = createButton(
    "表示調整を閉じる",
    "button button--secondary",
  );
  const controls = document.createElement("section");
  const previewSection = document.createElement("section");
  const canvasWrap = document.createElement("div");
  const canvas = document.createElement("canvas");
  const legend = document.createElement("div");
  const lineSpacingInput = document.createElement("input");
  const lineSpacingOutput = document.createElement("output");
  const verticalOffsetInput = document.createElement("input");
  const verticalOffsetOutput = document.createElement("output");
  const timeScaleInput = document.createElement("input");
  const timeScaleOutput = document.createElement("output");
  const fitButton = createButton("画面高に合わせる");
  const centerButton = createButton("中央に戻す");
  const homeButton = createButton("ホーム", "button practice-home-button");
  homeButton.classList.add("button--icon");
  homeButton.textContent = "⌂";
  homeButton.setAttribute("aria-label", "ホーム");
  homeButton.title = "ホーム";
  const playbackControls = mountPlaybackControls(
    playbackController,
    "horizontal-playback-controls",
    {
      leadingButton: homeButton,
      onSettingsChange: screenOptions.onPlaybackSettingsChange,
    },
  );
  const state: HorizontalScreenState = {
    lineSpacing: screenOptions.initialSettings?.lineSpacing ?? STAFF_LINE_SPACING,
    verticalOffset: screenOptions.initialSettings?.verticalOffset ?? 0,
    timeScale: screenOptions.initialSettings?.timeScale ?? 1,
  };
  let displayTextSettings =
    screenOptions.displayTextSettings ?? DEFAULT_DISPLAY_TEXT_SETTINGS;

  main.className = "practice-screen practice-screen--normal horizontal-screen";
  main.dataset.practiceMode = "practice";
  header.className = "practice-topbar horizontal-header";
  navigation.className = "practice-topbar__actions screen-navigation";
  header.append(playbackControls.element, navigation);

  controls.className = "horizontal-controls";
  controls.setAttribute("aria-label", "スコア表示の表示調整");

  const spacingGroup = document.createElement("div");
  const spacingLabel = createTextElement(
    "label",
    "horizontal-control__label",
    "五線の1間の幅",
  );
  const spacingValue = document.createElement("span");
  lineSpacingInput.id = "horizontal-line-spacing";
  lineSpacingInput.type = "range";
  lineSpacingInput.min = String(MIN_HORIZONTAL_LINE_SPACING);
  lineSpacingInput.max = String(MAX_HORIZONTAL_LINE_SPACING);
  lineSpacingInput.step = "1";
  lineSpacingInput.value = String(state.lineSpacing);
  lineSpacingInput.className = "horizontal-control__range";
  spacingLabel.htmlFor = lineSpacingInput.id;
  lineSpacingOutput.htmlFor = lineSpacingInput.id;
  lineSpacingOutput.value = String(state.lineSpacing);
  lineSpacingOutput.textContent = String(state.lineSpacing);
  spacingValue.className = "horizontal-control__value";
  spacingValue.append(lineSpacingOutput, document.createTextNode(" px"));
  spacingGroup.className = "horizontal-control";
  spacingGroup.append(spacingLabel, spacingValue, lineSpacingInput, fitButton);

  const offsetGroup = document.createElement("div");
  const offsetLabel = createTextElement(
    "label",
    "horizontal-control__label",
    "譜面の縦位置",
  );
  const offsetValue = document.createElement("span");
  verticalOffsetInput.id = "horizontal-vertical-offset";
  verticalOffsetInput.type = "range";
  verticalOffsetInput.step = "1";
  verticalOffsetInput.value = "0";
  verticalOffsetInput.className = "horizontal-control__range";
  offsetLabel.htmlFor = verticalOffsetInput.id;
  verticalOffsetOutput.htmlFor = verticalOffsetInput.id;
  verticalOffsetOutput.value = "0";
  verticalOffsetOutput.textContent = "0";
  offsetValue.className = "horizontal-control__value";
  offsetValue.append(verticalOffsetOutput, document.createTextNode(" px"));
  offsetGroup.className = "horizontal-control";
  offsetGroup.append(offsetLabel, offsetValue, verticalOffsetInput, centerButton);

  const timeScaleGroup = document.createElement("div");
  const timeScaleLabel = createTextElement(
    "label",
    "horizontal-control__label",
    "音価の幅",
  );
  const timeScaleValue = document.createElement("span");
  const initialTimeScalePercent = timeScaleToPercent(state.timeScale);
  timeScaleInput.id = "horizontal-time-scale";
  timeScaleInput.type = "range";
  timeScaleInput.min = "50";
  timeScaleInput.max = "200";
  timeScaleInput.step = "5";
  timeScaleInput.value = String(initialTimeScalePercent);
  timeScaleInput.className = "horizontal-control__range";
  timeScaleLabel.htmlFor = timeScaleInput.id;
  timeScaleOutput.htmlFor = timeScaleInput.id;
  timeScaleOutput.value = String(initialTimeScalePercent);
  timeScaleOutput.textContent = String(initialTimeScalePercent);
  timeScaleValue.className = "horizontal-control__value";
  timeScaleValue.append(timeScaleOutput, document.createTextNode(" %"));
  timeScaleGroup.className = "horizontal-control";
  timeScaleGroup.append(timeScaleLabel, timeScaleValue, timeScaleInput);

  legend.className = "horizontal-legend";
  legend.setAttribute("role", "group");
  legend.setAttribute("aria-label", "手の色分け");
  [
    ["右", "右手", "right"],
    ["左", "左手", "left"],
    ["—", "指定なし", "unspecified"],
  ].forEach(([marker, label, hand]) => {
    const item = document.createElement("span");
    const swatch = createTextElement(
      "span",
      `horizontal-legend__swatch horizontal-legend__swatch--${hand}`,
      marker ?? "",
    );
    item.className = "horizontal-legend__item";
    item.append(swatch, document.createTextNode(label ?? ""));
    legend.append(item);
  });

  adjustmentPanel.className =
    "practice-adjustment-panel horizontal-adjustment-panel";
  adjustmentPanel.setAttribute("aria-label", "スコア表示の表示調整モード");
  adjustmentHeader.className = "practice-adjustment-panel__header";
  adjustmentHeader.append(
    createTextElement(
      "h2",
      "practice-adjustment-panel__title",
      "表示調整モード",
    ),
    closeAdjustmentButton,
  );

  function openDataManagementOnLoadScreen(): void {
    const dataManagement = document.querySelector(
      '[data-testid="data-management"]',
    );

    if (dataManagement instanceof HTMLDetailsElement) {
      dataManagement.open = true;
    }
  }

  function returnHome(): void {
    cleanup();
    returnToLoadScreen();
  }

  function returnHomeWithDataManagement(): void {
    returnHome();
    openDataManagementOnLoadScreen();
  }

  navigation.append(
    createPracticeMenu({
      song,
      modeDescription:
        "音符ブロックが右から左へ流れるスコア表示です。薄い縦帯が再生ガイドです。演奏判定ではなく、譜面の流れを見るための目安です。時間が進む音符ほど右側へ、音名の綴りに応じて上下へ配置されます。",
      playbackSettingsElement: playbackControls.settingsElement,
      legend,
      displayTextSettings,
      switchViewLabel:
        switchToVertical === undefined
          ? undefined
          : "ピアノ表示へ切り替え",
      onOpenDisplayAdjustment: () => {
        setPracticeMode("adjustment");
      },
      onDisplayTextSettingsChange: updateDisplayTextSettings,
      onSwitchView:
        switchToVertical === undefined
          ? undefined
          : () => {
              cleanup();
              switchToVertical();
            },
      onOpenSavedList: returnHomeWithDataManagement,
      onReturnToLoadScreen: returnHome,
    }),
  );

  previewSection.className = "practice-canvas-region horizontal-preview";
  previewSection.setAttribute("aria-label", "スコア表示Canvas");
  canvasWrap.className = "horizontal-canvas-wrap";
  canvas.className = "horizontal-canvas";
  canvas.setAttribute(
    "aria-label",
    `${song.title}のスコア表示再生プレビュー`,
  );
  canvas.textContent = "Canvasに対応したブラウザで表示してください。";
  canvasWrap.append(canvas);
  previewSection.append(canvasWrap);

  controls.append(spacingGroup, offsetGroup, timeScaleGroup);
  adjustmentPanel.append(adjustmentHeader, controls);
  main.append(header, playbackControls.seekElement, adjustmentPanel, previewSection);
  root.replaceChildren(main);

  let frameId = 0;

  function setPracticeMode(mode: "practice" | "adjustment"): void {
    main.dataset.practiceMode = mode;
    main.classList.toggle("practice-screen--normal", mode === "practice");
    main.classList.toggle(
      "practice-screen--adjusting",
      mode === "adjustment",
    );
    scheduleRender();
  }

  function getCanvasSize(): { width: number; height: number } {
    return {
      width: Math.max(1, canvasWrap.clientWidth),
      height: Math.max(1, canvasWrap.clientHeight),
    };
  }

  function updateControls(canvasHeight: number): void {
    const offsetLimit = Math.max(80, Math.round(canvasHeight));
    state.lineSpacing = normalizeHorizontalLineSpacing(state.lineSpacing);
    state.verticalOffset = Math.min(
      offsetLimit,
      Math.max(-offsetLimit, Math.round(state.verticalOffset)),
    );

    lineSpacingInput.value = String(state.lineSpacing);
    lineSpacingOutput.value = String(state.lineSpacing);
    lineSpacingOutput.textContent = String(state.lineSpacing);
    verticalOffsetInput.min = String(-offsetLimit);
    verticalOffsetInput.max = String(offsetLimit);
    verticalOffsetInput.value = String(state.verticalOffset);
    verticalOffsetOutput.value = String(state.verticalOffset);
    verticalOffsetOutput.textContent = String(state.verticalOffset);
    const timeScalePercent = timeScaleToPercent(state.timeScale);
    timeScaleInput.value = String(timeScalePercent);
    timeScaleOutput.value = String(timeScalePercent);
    timeScaleOutput.textContent = String(timeScalePercent);
    canvas.dataset.staffLineSpacing = String(state.lineSpacing);
    canvas.dataset.verticalOffset = String(state.verticalOffset);
    canvas.dataset.timeScale = String(state.timeScale);
    canvas.dataset.timeScalePercent = String(timeScalePercent);
  }

  function persistViewSettings(): void {
    updateControls(getCanvasSize().height);
    screenOptions.onSettingsChange?.({
      lineSpacing: state.lineSpacing,
      verticalOffset: state.verticalOffset,
      timeScale: state.timeScale,
    });
  }

  function updateDisplayTextSettings(settings: DisplayTextSettings): void {
    displayTextSettings = settings;
    screenOptions.onDisplayTextSettingsChange?.(settings);
    scheduleRender();
  }

  function render(): void {
    frameId = 0;
    const playbackState = playbackController.tick();
    const displayBeat = calculateDisplayBeat(playbackState);
    const size = getCanvasSize();
    updateControls(size.height);
    const scene = createHorizontalScene(song, {
      width: size.width,
      height: size.height,
      pixelsPerBeat: HORIZONTAL_PIXELS_PER_BEAT * state.timeScale,
      lineSpacing: state.lineSpacing,
      verticalOffset: state.verticalOffset,
      currentBeat: playbackState.currentBeat,
      displayBeat,
    });
    const context = resizeCanvasForDisplay(canvas, {
      cssWidth: size.width,
      cssHeight: size.height,
      devicePixelRatio: window.devicePixelRatio || 1,
    });

    canvas.dataset.playbackGuideX = String(scene.playbackGuideX);
    canvas.dataset.judgmentLineX = String(scene.judgmentLineX);
    canvas.dataset.noteCount = String(scene.notes.length);
    canvas.dataset.staffLineSpacing = String(scene.staff.lineSpacing);
    canvas.dataset.verticalOffset = String(scene.verticalOffset);
    canvas.dataset.currentBeat = formatBeat(playbackState.currentBeat);
    canvas.dataset.displayBeat = displayBeat.toFixed(2);
    canvas.dataset.endBeat = formatBeat(playbackState.endBeat);
    canvas.dataset.playbackRate = formatPlaybackRate(
      playbackState.playbackRate,
    );
    canvas.dataset.playbackStatus = playbackState.status;
    canvas.dataset.pixelsPerBeat = String(scene.pixelsPerBeat);
    canvas.dataset.showNoteNames = String(displayTextSettings.showNoteNames);
    canvas.dataset.showFingerNumbers = String(
      displayTextSettings.showFingerNumbers,
    );
    const beatGridLines = scene.beatLines.filter(
      (line) => line.kind === "beat",
    );
    const measureGridLines = scene.beatLines.filter(
      (line) => line.kind === "measure",
    );
    canvas.dataset.timeGridLineCount = String(scene.beatLines.length);
    canvas.dataset.beatGridLineCount = String(beatGridLines.length);
    canvas.dataset.measureGridLineCount = String(measureGridLines.length);
    canvas.dataset.firstBeatGridLinePosition =
      beatGridLines[0]?.x.toFixed(2) ?? "";
    canvas.dataset.firstMeasureGridLinePosition =
      measureGridLines[0]?.x.toFixed(2) ?? "";
    const noteLabelLayouts = scene.notes
      .filter((note) => note.visible)
      .map((note) => ({
        note,
        layout: createHorizontalNoteLabelLayout(note, displayTextSettings),
      }))
      .filter(({ layout }) => layout.visible);
    const representativeLabel =
      noteLabelLayouts.find(
        ({ note }) =>
          displayTextSettings.showFingerNumbers !== false &&
          note.finger !== undefined,
      ) ?? noteLabelLayouts[0];
    canvas.dataset.noteLabelAlign =
      representativeLabel?.layout.textAlign ?? "none";
    canvas.dataset.noteLabelText = representativeLabel?.layout.text ?? "";
    canvas.dataset.noteLabelTexts = noteLabelLayouts
      .map(({ layout }) => layout.text)
      .join("|");
    canvas.dataset.noteLabelX =
      representativeLabel?.layout.x.toFixed(2) ?? "";
    canvas.dataset.noteLabelNoteX =
      representativeLabel?.note.x.toFixed(2) ?? "";
    canvas.dataset.noteLabelMaxWidth =
      representativeLabel?.layout.maxWidth.toFixed(2) ?? "";
    const accentedNotes = scene.notes.filter(
      (note) => note.visible && note.accidental !== "natural",
    );
    canvas.dataset.accidentalAccentCount = String(accentedNotes.length);
    canvas.dataset.accidentalAccentKinds = accentedNotes
      .map((note) => note.accidental)
      .join("|");
    canvas.dataset.accidentalAccentNoteIds = accentedNotes
      .map((note) => note.id)
      .join("|");
    drawHorizontalScene(context, scene, displayTextSettings);

    if (
      playbackState.status === "playing" ||
      playbackState.status === "precount"
    ) {
      scheduleRender();
    }
  }

  function scheduleRender(): void {
    if (frameId !== 0) {
      return;
    }

    frameId = window.requestAnimationFrame(render);
  }

  function cleanup(): void {
    resizeObserver.disconnect();
    unsubscribePlayback();
    playbackControls.cleanup();
    window.removeEventListener("resize", scheduleRender);
    document.removeEventListener("visibilitychange", handleVisibilityChange);

    if (frameId !== 0) {
      window.cancelAnimationFrame(frameId);
    }
  }

  function fitToCanvasHeight(): void {
    const size = getCanvasSize();
    state.lineSpacing = calculateFittedHorizontalLineSpacing(
      song,
      size.height,
    );
    state.verticalOffset = 0;
    persistViewSettings();
    scheduleRender();
  }

  function centerContent(): void {
    state.verticalOffset = 0;
    persistViewSettings();
    scheduleRender();
  }

  lineSpacingInput.addEventListener("input", () => {
    state.lineSpacing = normalizeHorizontalLineSpacing(
      Number(lineSpacingInput.value),
    );
    persistViewSettings();
    scheduleRender();
  });

  verticalOffsetInput.addEventListener("input", () => {
    state.verticalOffset = Number(verticalOffsetInput.value);
    persistViewSettings();
    scheduleRender();
  });

  timeScaleInput.addEventListener("input", () => {
    state.timeScale = percentToTimeScale(Number(timeScaleInput.value));
    persistViewSettings();
    scheduleRender();
  });

  homeButton.addEventListener("click", returnHome);
  fitButton.addEventListener("click", fitToCanvasHeight);
  centerButton.addEventListener("click", centerContent);
  closeAdjustmentButton.addEventListener("click", () => {
    setPracticeMode("practice");
  });

  const resizeObserver = new ResizeObserver(scheduleRender);
  resizeObserver.observe(canvasWrap);
  window.addEventListener("resize", scheduleRender);
  const unsubscribePlayback = playbackController.subscribe(() => {
    scheduleRender();
  });

  function handleVisibilityChange(): void {
    if (document.visibilityState === "hidden") {
      playbackController.pauseForVisibilityChange();
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);

  scheduleRender();
}
