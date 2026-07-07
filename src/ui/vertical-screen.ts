import {
  calculateCenteredOffset,
  clampHorizontalOffset,
  createKeyboardGeometry,
  fitWhiteKeyWidth,
  getHorizontalOffsetRange,
  normalizeWhiteKeyWidth,
  preserveContentCenterOffset,
  resolveSongPitchRange,
} from "../core/keyboard-geometry";
import {
  calculateDisplayBeat,
  formatBeat,
  formatPlaybackRate,
} from "../core/timeline";
import {
  COMPACT_KEYBOARD_GUIDE_HEIGHT_SCALE,
  PIXELS_PER_BEAT,
  createVerticalScene,
  shouldUseCompactKeyboardGuide,
} from "../core/vertical-layout";
import {
  percentToTimeScale,
  timeScaleToPercent,
} from "../core/time-scale";
import {
  DEFAULT_DISPLAY_TEXT_SETTINGS,
  type DisplayTextSettings,
  type VerticalViewSettings,
} from "../core/app-settings";
import type { PlaybackState } from "../core/timeline";
import type { PlaybackController } from "../playback/playback-controller";
import {
  drawVerticalScene,
  resizeCanvasForDisplay,
} from "../renderers/vertical-renderer";
import { mountPlaybackControls } from "./playback-controls";
import { createPracticeMenu } from "./practice-menu";
import type { Song } from "../types/song";

interface VerticalScreenState {
  whiteKeyWidth: number;
  horizontalOffset: number;
  timeScale: number;
  initialized: boolean;
}

export interface VerticalScreenOptions {
  readonly initialSettings?: VerticalViewSettings;
  readonly displayTextSettings?: DisplayTextSettings;
  readonly onSettingsChange?: (settings: VerticalViewSettings) => void;
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

export function mountVerticalScreen(
  root: HTMLElement,
  song: Song,
  returnToLoadScreen: () => void,
  playbackController: PlaybackController,
  switchToHorizontal?: () => void,
  screenOptions: VerticalScreenOptions = {},
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
  const canvasSection = document.createElement("section");
  const canvasWrap = document.createElement("div");
  const canvas = document.createElement("canvas");
  const whiteWidthInput = document.createElement("input");
  const whiteWidthOutput = document.createElement("output");
  const offsetInput = document.createElement("input");
  const offsetOutput = document.createElement("output");
  const timeScaleInput = document.createElement("input");
  const timeScaleOutput = document.createElement("output");
  const fitButton = createButton("画面幅に合わせる");
  const centerButton = createButton("中央に戻す");
  const homeButton = createButton("ホーム", "button practice-home-button");
  homeButton.classList.add("button--icon");
  homeButton.textContent = "⌂";
  homeButton.setAttribute("aria-label", "ホーム");
  homeButton.title = "ホーム";
  const playbackControls = mountPlaybackControls(
    playbackController,
    "vertical-playback-controls",
    {
      leadingButton: homeButton,
      onSettingsChange: screenOptions.onPlaybackSettingsChange,
    },
  );
  const range = resolveSongPitchRange(song);
  const initialGeometry = createKeyboardGeometry(range, 64);
  const state: VerticalScreenState = {
    whiteKeyWidth: screenOptions.initialSettings?.whiteKeyWidth ?? 64,
    horizontalOffset: screenOptions.initialSettings?.horizontalOffset ?? 0,
    timeScale: screenOptions.initialSettings?.timeScale ?? 1,
    initialized: screenOptions.initialSettings !== undefined,
  };
  let displayTextSettings =
    screenOptions.displayTextSettings ?? DEFAULT_DISPLAY_TEXT_SETTINGS;

  main.className = "practice-screen practice-screen--normal vertical-screen";
  main.dataset.practiceMode = "practice";
  header.className = "practice-topbar vertical-header";
  navigation.className = "practice-topbar__actions screen-navigation";
  header.append(playbackControls.element, navigation);

  controls.className = "vertical-controls";
  controls.setAttribute("aria-label", "鍵盤位置調整");

  const widthGroup = document.createElement("div");
  const widthLabel = createTextElement(
    "label",
    "vertical-control__label",
    "白鍵1鍵の幅",
  );
  const widthValue = document.createElement("span");
  whiteWidthInput.id = "white-key-width";
  whiteWidthInput.type = "range";
  whiteWidthInput.min = "16";
  whiteWidthInput.max = "320";
  whiteWidthInput.step = "1";
  whiteWidthInput.value = String(state.whiteKeyWidth);
  whiteWidthInput.className = "vertical-control__range";
  widthLabel.htmlFor = whiteWidthInput.id;
  whiteWidthOutput.htmlFor = whiteWidthInput.id;
  whiteWidthOutput.value = String(state.whiteKeyWidth);
  widthValue.className = "vertical-control__value";
  widthValue.append(whiteWidthOutput, document.createTextNode(" px"));
  widthGroup.className = "vertical-control";
  widthGroup.append(widthLabel, widthValue, whiteWidthInput, fitButton);

  const offsetGroup = document.createElement("div");
  const offsetLabel = createTextElement(
    "label",
    "vertical-control__label",
    "譜面の横位置",
  );
  const offsetValue = document.createElement("span");
  offsetInput.id = "horizontal-offset";
  offsetInput.type = "range";
  offsetInput.step = "1";
  offsetInput.value = "0";
  offsetInput.className = "vertical-control__range";
  offsetLabel.htmlFor = offsetInput.id;
  offsetOutput.htmlFor = offsetInput.id;
  offsetOutput.value = "0";
  offsetValue.className = "vertical-control__value";
  offsetValue.append(offsetOutput, document.createTextNode(" px"));
  offsetGroup.className = "vertical-control";
  offsetGroup.append(offsetLabel, offsetValue, offsetInput, centerButton);

  const timeScaleGroup = document.createElement("div");
  const timeScaleLabel = createTextElement(
    "label",
    "vertical-control__label",
    "音価の幅",
  );
  const timeScaleValue = document.createElement("span");
  const initialTimeScalePercent = timeScaleToPercent(state.timeScale);
  timeScaleInput.id = "vertical-time-scale";
  timeScaleInput.type = "range";
  timeScaleInput.min = "50";
  timeScaleInput.max = "200";
  timeScaleInput.step = "5";
  timeScaleInput.value = String(initialTimeScalePercent);
  timeScaleInput.className = "vertical-control__range";
  timeScaleLabel.htmlFor = timeScaleInput.id;
  timeScaleOutput.htmlFor = timeScaleInput.id;
  timeScaleOutput.value = String(initialTimeScalePercent);
  timeScaleOutput.textContent = String(initialTimeScalePercent);
  timeScaleValue.className = "vertical-control__value";
  timeScaleValue.append(timeScaleOutput, document.createTextNode(" %"));
  timeScaleGroup.className = "vertical-control";
  timeScaleGroup.append(timeScaleLabel, timeScaleValue, timeScaleInput);

  const legend = document.createElement("div");
  legend.className = "vertical-legend";
  legend.setAttribute("role", "group");
  legend.setAttribute("aria-label", "手の補助表示");
  [
    ["右", "右手", "right"],
    ["左", "左手", "left"],
    ["—", "指定なし", "unspecified"],
  ].forEach(([marker, label, hand]) => {
    const item = document.createElement("span");
    const swatch = createTextElement(
      "span",
      `vertical-legend__swatch vertical-legend__swatch--${hand}`,
      marker ?? "",
    );
    item.className = "vertical-legend__item";
    item.append(swatch, document.createTextNode(label ?? ""));
    legend.append(item);
  });

  controls.append(widthGroup, offsetGroup, timeScaleGroup);

  adjustmentPanel.className =
    "practice-adjustment-panel vertical-adjustment-panel";
  adjustmentPanel.setAttribute("aria-label", "ピアノ表示の表示調整モード");
  adjustmentHeader.className = "practice-adjustment-panel__header";
  adjustmentHeader.append(
    createTextElement(
      "h2",
      "practice-adjustment-panel__title",
      "表示調整モード",
    ),
    closeAdjustmentButton,
  );
  adjustmentPanel.append(adjustmentHeader, controls);

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
        "音符ブロックが上から下へ流れるピアノ表示です。薄い帯が再生ガイドです。演奏判定ではなく、譜面の流れを見るための目安です。Canvasを横へドラッグして位置を微調整できます。",
      playbackSettingsElement: playbackControls.settingsElement,
      legend,
      displayTextSettings,
      switchViewLabel:
        switchToHorizontal === undefined
          ? undefined
          : "スコア表示へ切り替え",
      onOpenDisplayAdjustment: () => {
        setPracticeMode("adjustment");
      },
      onDisplayTextSettingsChange: updateDisplayTextSettings,
      onSwitchView:
        switchToHorizontal === undefined
          ? undefined
          : () => {
              cleanup();
              switchToHorizontal();
            },
      onOpenSavedList: returnHomeWithDataManagement,
      onReturnToLoadScreen: returnHome,
    }),
  );

  canvasSection.className = "practice-canvas-region vertical-preview";
  canvasSection.setAttribute("aria-label", "ピアノ表示Canvas");
  canvasWrap.className = "vertical-canvas-wrap";
  canvas.className = "vertical-canvas";
  canvas.setAttribute(
    "aria-label",
    `${song.title}のピアノ表示再生プレビュー`,
  );
  canvas.textContent = "Canvasに対応したブラウザで表示してください。";
  canvasWrap.append(canvas);
  canvasSection.append(canvasWrap);

  main.append(header, playbackControls.seekElement, adjustmentPanel, canvasSection);
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

  function updateOffsetControl(
    canvasWidth: number,
    contentWidth: number,
  ): void {
    const offsetRange = getHorizontalOffsetRange(canvasWidth, contentWidth);
    state.horizontalOffset = clampHorizontalOffset(
      state.horizontalOffset,
      canvasWidth,
      contentWidth,
    );
    offsetInput.min = String(offsetRange.min);
    offsetInput.max = String(offsetRange.max);
    offsetInput.value = String(state.horizontalOffset);
    offsetOutput.value = String(state.horizontalOffset);
    canvas.dataset.horizontalOffset = String(state.horizontalOffset);
  }

  function persistViewSettings(): void {
    const size = getCanvasSize();
    const geometry = createKeyboardGeometry(range, state.whiteKeyWidth);
    state.horizontalOffset = clampHorizontalOffset(
      state.horizontalOffset,
      size.width,
      geometry.totalWidth,
    );
    screenOptions.onSettingsChange?.({
      whiteKeyWidth: state.whiteKeyWidth,
      horizontalOffset: state.horizontalOffset,
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

    if (!state.initialized) {
      state.whiteKeyWidth = fitWhiteKeyWidth(
        size.width,
        initialGeometry.whiteKeys.length,
      );
      const geometry = createKeyboardGeometry(range, state.whiteKeyWidth);
      state.horizontalOffset = calculateCenteredOffset(
        size.width,
        geometry.totalWidth,
      );
      state.initialized = true;
    }

    const geometry = createKeyboardGeometry(range, state.whiteKeyWidth);
    updateOffsetControl(size.width, geometry.totalWidth);
    whiteWidthInput.value = String(state.whiteKeyWidth);
    whiteWidthOutput.value = String(state.whiteKeyWidth);
    const timeScalePercent = timeScaleToPercent(state.timeScale);
    timeScaleInput.value = String(timeScalePercent);
    timeScaleOutput.value = String(timeScalePercent);
    timeScaleOutput.textContent = String(timeScalePercent);
    const keyboardGuideHeightScale = shouldUseCompactKeyboardGuide({
      width: window.innerWidth,
      height: window.innerHeight,
    })
      ? COMPACT_KEYBOARD_GUIDE_HEIGHT_SCALE
      : 1;
    canvas.dataset.whiteKeyWidth = String(state.whiteKeyWidth);
    canvas.dataset.timeScale = String(state.timeScale);
    canvas.dataset.timeScalePercent = String(timeScalePercent);
    canvas.dataset.keyboardGuideHeightScale = String(
      keyboardGuideHeightScale,
    );
    canvas.dataset.showNoteNames = String(displayTextSettings.showNoteNames);
    canvas.dataset.showFingerNumbers = String(
      displayTextSettings.showFingerNumbers,
    );

    const scene = createVerticalScene(song, {
      width: size.width,
      height: size.height,
      whiteKeyWidth: state.whiteKeyWidth,
      horizontalOffset: state.horizontalOffset,
      pixelsPerBeat: PIXELS_PER_BEAT * state.timeScale,
      currentBeat: playbackState.currentBeat,
      displayBeat,
      keyboardGuideHeightScale,
    });
    const context = resizeCanvasForDisplay(canvas, {
      cssWidth: size.width,
      cssHeight: size.height,
      devicePixelRatio: window.devicePixelRatio || 1,
    });
    canvas.dataset.currentBeat = formatBeat(playbackState.currentBeat);
    canvas.dataset.displayBeat = displayBeat.toFixed(2);
    canvas.dataset.endBeat = formatBeat(playbackState.endBeat);
    canvas.dataset.playbackRate = formatPlaybackRate(
      playbackState.playbackRate,
    );
    canvas.dataset.playbackStatus = playbackState.status;
    canvas.dataset.pixelsPerBeat = String(scene.pixelsPerBeat);
    canvas.dataset.whiteKeyGuideHeight = scene.whiteKeyGuideHeight.toFixed(2);
    canvas.dataset.blackKeyGuideHeight = scene.blackKeyGuideHeight.toFixed(2);
    canvas.dataset.playbackGuideY = scene.playbackGuideY.toFixed(2);
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
      beatGridLines[0]?.y.toFixed(2) ?? "";
    canvas.dataset.firstMeasureGridLinePosition =
      measureGridLines[0]?.y.toFixed(2) ?? "";
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
    drawVerticalScene(context, scene, displayTextSettings);

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

  function fitToCanvas(): void {
    const size = getCanvasSize();
    state.whiteKeyWidth = fitWhiteKeyWidth(
      size.width,
      initialGeometry.whiteKeys.length,
    );
    const geometry = createKeyboardGeometry(range, state.whiteKeyWidth);
    state.horizontalOffset = calculateCenteredOffset(
      size.width,
      geometry.totalWidth,
    );
    persistViewSettings();
    scheduleRender();
  }

  function centerContent(): void {
    const size = getCanvasSize();
    const geometry = createKeyboardGeometry(range, state.whiteKeyWidth);
    state.horizontalOffset = calculateCenteredOffset(
      size.width,
      geometry.totalWidth,
    );
    persistViewSettings();
    scheduleRender();
  }

  whiteWidthInput.addEventListener("input", () => {
    const previousGeometry = createKeyboardGeometry(
      range,
      state.whiteKeyWidth,
    );
    const nextWhiteKeyWidth = normalizeWhiteKeyWidth(
      Number(whiteWidthInput.value),
    );
    const nextGeometry = createKeyboardGeometry(range, nextWhiteKeyWidth);
    state.horizontalOffset = preserveContentCenterOffset(
      state.horizontalOffset,
      previousGeometry.totalWidth,
      nextGeometry.totalWidth,
    );
    state.whiteKeyWidth = nextWhiteKeyWidth;
    persistViewSettings();
    scheduleRender();
  });

  offsetInput.addEventListener("input", () => {
    state.horizontalOffset = Number(offsetInput.value);
    persistViewSettings();
    scheduleRender();
  });

  timeScaleInput.addEventListener("input", () => {
    state.timeScale = percentToTimeScale(Number(timeScaleInput.value));
    persistViewSettings();
    scheduleRender();
  });

  homeButton.addEventListener("click", returnHome);
  fitButton.addEventListener("click", fitToCanvas);
  centerButton.addEventListener("click", centerContent);
  closeAdjustmentButton.addEventListener("click", () => {
    setPracticeMode("practice");
  });

  let pointerId: number | undefined;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerStartOffset = 0;
  let horizontalDrag = false;

  canvas.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerStartOffset = state.horizontalOffset;
    horizontalDrag = false;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - pointerStartX;
    const deltaY = event.clientY - pointerStartY;

    if (!horizontalDrag && Math.abs(deltaX) > 4) {
      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        pointerId = undefined;
        return;
      }

      horizontalDrag = true;
    }

    if (!horizontalDrag) {
      return;
    }

    event.preventDefault();
    state.horizontalOffset = pointerStartOffset + deltaX;
    scheduleRender();
  });

  function finishPointer(event: PointerEvent): void {
    const shouldPersist = pointerId === event.pointerId && horizontalDrag;

    if (pointerId === event.pointerId && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    pointerId = undefined;
    horizontalDrag = false;

    if (shouldPersist) {
      persistViewSettings();
    }
  }

  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);

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

  scheduleRender();
}
