import { STAFF_LINE_SPACING } from "../core/staff-position";
import { calculateDisplayBeat, formatBeat } from "../core/timeline";
import type { PlaybackState } from "../core/timeline";
import type { HorizontalViewSettings } from "../core/app-settings";
import {
  MAX_HORIZONTAL_LINE_SPACING,
  MIN_HORIZONTAL_LINE_SPACING,
  calculateFittedHorizontalLineSpacing,
  createHorizontalScene,
  normalizeHorizontalLineSpacing,
} from "../core/horizontal-layout";
import type { PlaybackController } from "../playback/playback-controller";
import { resizeCanvasForDisplay } from "../renderers/canvas";
import { drawHorizontalScene } from "../renderers/horizontal-renderer";
import { mountPlaybackControls } from "./playback-controls";
import { createPracticeMenu } from "./practice-menu";
import type { Song } from "../types/song";

interface HorizontalScreenState {
  lineSpacing: number;
  verticalOffset: number;
}

export interface HorizontalScreenOptions {
  readonly initialSettings?: HorizontalViewSettings;
  readonly onSettingsChange?: (settings: HorizontalViewSettings) => void;
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
  const backButton = createButton("ロード画面へ戻る", "button button--secondary");
  const switchButton = createButton(
    "縦表示へ切り替え",
    "button button--primary button--view-switch",
  );
  const priorityPanel = document.createElement("section");
  const controls = document.createElement("section");
  const previewSection = document.createElement("section");
  const canvasWrap = document.createElement("div");
  const canvas = document.createElement("canvas");
  const legend = document.createElement("div");
  const lineSpacingInput = document.createElement("input");
  const lineSpacingOutput = document.createElement("output");
  const verticalOffsetInput = document.createElement("input");
  const verticalOffsetOutput = document.createElement("output");
  const fitButton = createButton("画面高に合わせる");
  const centerButton = createButton("中央に戻す");
  const playbackControls = mountPlaybackControls(
    playbackController,
    "horizontal-playback-controls",
    {
      onSettingsChange: screenOptions.onPlaybackSettingsChange,
    },
  );
  const state: HorizontalScreenState = {
    lineSpacing: screenOptions.initialSettings?.lineSpacing ?? STAFF_LINE_SPACING,
    verticalOffset: screenOptions.initialSettings?.verticalOffset ?? 0,
  };

  main.className = "horizontal-screen";
  header.className = "horizontal-header";
  navigation.className = "screen-navigation";

  if (switchToVertical !== undefined) {
    navigation.append(switchButton);
  }
  navigation.append(
    createPracticeMenu({
      song,
      backButton,
      modeDescription:
        "横表示では、五線の1間の幅と譜面の縦位置を見やすさに合わせて調整します。",
    }),
  );

  header.append(
    navigation,
    createTextElement("p", "horizontal-header__eyebrow", "再生プレビュー"),
    createTextElement("h1", "horizontal-header__title", song.title),
    createTextElement(
      "p",
      "horizontal-header__description",
      "音符ブロックが右から左へ流れる横表示です。縦表示で覚えた鍵盤上の動きを、五線に近い上下位置へ結び付けます。",
    ),
  );

  priorityPanel.className =
    "practice-priority-panel horizontal-priority-panel";
  priorityPanel.setAttribute("aria-label", "練習中によく使う操作");

  controls.className = "horizontal-controls";
  controls.setAttribute("aria-label", "横表示の表示調整");

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

  previewSection.className = "horizontal-preview";
  previewSection.setAttribute("aria-labelledby", "horizontal-preview-title");
  const previewHeading = createTextElement(
    "h2",
    "horizontal-preview__title",
    "横表示プレビュー",
  );
  previewHeading.id = "horizontal-preview-title";
  canvasWrap.className = "horizontal-canvas-wrap";
  canvas.className = "horizontal-canvas";
  canvas.setAttribute(
    "aria-label",
    `${song.title}の横表示再生プレビュー`,
  );
  canvas.textContent = "Canvasに対応したブラウザで表示してください。";
  canvasWrap.append(canvas);
  previewSection.append(
    previewHeading,
    createTextElement(
      "p",
      "horizontal-preview__help",
      "薄い縦帯が再生ガイドです。演奏判定ではなく、譜面の流れを見るための目安です。時間が進む音符ほど右側へ、音名の綴りに応じて上下へ配置されます。",
    ),
    canvasWrap,
  );

  controls.append(spacingGroup, offsetGroup, legend);
  priorityPanel.append(playbackControls.element, controls);
  main.append(header, priorityPanel, previewSection);
  root.replaceChildren(main);

  let frameId = 0;

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
    canvas.dataset.staffLineSpacing = String(state.lineSpacing);
    canvas.dataset.verticalOffset = String(state.verticalOffset);
  }

  function persistViewSettings(): void {
    updateControls(getCanvasSize().height);
    screenOptions.onSettingsChange?.({
      lineSpacing: state.lineSpacing,
      verticalOffset: state.verticalOffset,
    });
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
    canvas.dataset.playbackRate = playbackState.playbackRate.toFixed(1);
    canvas.dataset.playbackStatus = playbackState.status;
    drawHorizontalScene(context, scene);

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

  fitButton.addEventListener("click", fitToCanvasHeight);
  centerButton.addEventListener("click", centerContent);

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

  backButton.addEventListener("click", () => {
    cleanup();
    returnToLoadScreen();
  });

  switchButton.addEventListener("click", () => {
    if (switchToVertical === undefined) {
      return;
    }

    cleanup();
    switchToVertical();
  });

  scheduleRender();
}
