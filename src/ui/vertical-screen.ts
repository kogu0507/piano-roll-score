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
import { createVerticalScene } from "../core/vertical-layout";
import {
  drawVerticalScene,
  resizeCanvasForDisplay,
} from "../renderers/vertical-renderer";
import type { Song } from "../types/song";

interface VerticalScreenState {
  whiteKeyWidth: number;
  horizontalOffset: number;
  initialized: boolean;
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
): void {
  const main = document.createElement("main");
  const header = document.createElement("header");
  const backButton = createButton("ロード画面へ戻る");
  const controls = document.createElement("section");
  const canvasSection = document.createElement("section");
  const canvasWrap = document.createElement("div");
  const canvas = document.createElement("canvas");
  const whiteWidthInput = document.createElement("input");
  const whiteWidthOutput = document.createElement("output");
  const offsetInput = document.createElement("input");
  const offsetOutput = document.createElement("output");
  const fitButton = createButton("画面幅に合わせる");
  const centerButton = createButton("中央に戻す");
  const range = resolveSongPitchRange(song);
  const initialGeometry = createKeyboardGeometry(range, 64);
  const state: VerticalScreenState = {
    whiteKeyWidth: 64,
    horizontalOffset: 0,
    initialized: false,
  };

  main.className = "vertical-screen";
  header.className = "vertical-header";
  header.append(
    backButton,
    createTextElement("p", "vertical-header__eyebrow", "静止プレビュー"),
    createTextElement("h1", "vertical-header__title", song.title),
    createTextElement(
      "p",
      "vertical-header__description",
      "再生位置0拍の縦表示です。白鍵幅と横位置を実際の鍵盤に合わせて調整できます。",
    ),
  );

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

  const legend = document.createElement("div");
  legend.className = "vertical-legend";
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
      `vertical-legend__swatch vertical-legend__swatch--${hand}`,
      marker ?? "",
    );
    item.className = "vertical-legend__item";
    item.append(swatch, document.createTextNode(label ?? ""));
    legend.append(item);
  });

  controls.append(widthGroup, offsetGroup, legend);

  canvasSection.className = "vertical-preview";
  canvasSection.setAttribute("aria-labelledby", "vertical-preview-title");
  const canvasHeading = createTextElement(
    "h2",
    "vertical-preview__title",
    "縦表示プレビュー",
  );
  canvasHeading.id = "vertical-preview-title";
  canvasWrap.className = "vertical-canvas-wrap";
  canvas.className = "vertical-canvas";
  canvas.setAttribute(
    "aria-label",
    `${song.title}の縦表示静止プレビュー`,
  );
  canvas.textContent = "Canvasに対応したブラウザで表示してください。";
  canvasWrap.append(canvas);
  canvasSection.append(
    canvasHeading,
    createTextElement(
      "p",
      "vertical-preview__help",
      "赤い線が判定ラインです。Canvasを横へドラッグして位置を微調整できます。",
    ),
    canvasWrap,
  );

  main.append(header, controls, canvasSection);
  root.replaceChildren(main);

  let frameId = 0;

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

  function render(): void {
    frameId = 0;
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
    canvas.dataset.whiteKeyWidth = String(state.whiteKeyWidth);

    const scene = createVerticalScene(song, {
      width: size.width,
      height: size.height,
      whiteKeyWidth: state.whiteKeyWidth,
      horizontalOffset: state.horizontalOffset,
    });
    const context = resizeCanvasForDisplay(canvas, {
      cssWidth: size.width,
      cssHeight: size.height,
      devicePixelRatio: window.devicePixelRatio || 1,
    });
    drawVerticalScene(context, scene);
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
    scheduleRender();
  }

  function centerContent(): void {
    const size = getCanvasSize();
    const geometry = createKeyboardGeometry(range, state.whiteKeyWidth);
    state.horizontalOffset = calculateCenteredOffset(
      size.width,
      geometry.totalWidth,
    );
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
    scheduleRender();
  });

  offsetInput.addEventListener("input", () => {
    state.horizontalOffset = Number(offsetInput.value);
    scheduleRender();
  });

  fitButton.addEventListener("click", fitToCanvas);
  centerButton.addEventListener("click", centerContent);

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
    if (pointerId === event.pointerId && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    pointerId = undefined;
    horizontalDrag = false;
  }

  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);

  const resizeObserver = new ResizeObserver(scheduleRender);
  resizeObserver.observe(canvasWrap);
  window.addEventListener("resize", scheduleRender);

  backButton.addEventListener("click", () => {
    resizeObserver.disconnect();
    window.removeEventListener("resize", scheduleRender);

    if (frameId !== 0) {
      window.cancelAnimationFrame(frameId);
    }

    returnToLoadScreen();
  });

  scheduleRender();
}
