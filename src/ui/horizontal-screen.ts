import { createHorizontalScene } from "../core/horizontal-layout";
import { resizeCanvasForDisplay } from "../renderers/canvas";
import { drawHorizontalScene } from "../renderers/horizontal-renderer";
import type { Song } from "../types/song";

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
  switchToVertical?: () => void,
): void {
  const main = document.createElement("main");
  const header = document.createElement("header");
  const navigation = document.createElement("div");
  const backButton = createButton("ロード画面へ戻る");
  const switchButton = createButton("縦表示へ切り替え");
  const previewSection = document.createElement("section");
  const canvasWrap = document.createElement("div");
  const canvas = document.createElement("canvas");
  const legend = document.createElement("div");

  main.className = "horizontal-screen";
  header.className = "horizontal-header";
  navigation.className = "screen-navigation";
  navigation.append(backButton);

  if (switchToVertical !== undefined) {
    navigation.append(switchButton);
  }

  header.append(
    navigation,
    createTextElement("p", "horizontal-header__eyebrow", "静止プレビュー"),
    createTextElement("h1", "horizontal-header__title", song.title),
    createTextElement(
      "p",
      "horizontal-header__description",
      "横表示の静止プレビューです。縦表示で覚えた鍵盤上の動きを、五線に近い上下位置へ結び付けます。",
    ),
  );

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
    `${song.title}の横表示静止プレビュー`,
  );
  canvas.textContent = "Canvasに対応したブラウザで表示してください。";
  canvasWrap.append(canvas);
  previewSection.append(
    previewHeading,
    createTextElement(
      "p",
      "horizontal-preview__help",
      "赤い縦線が判定ラインです。時間が進む音符ほど右側へ、音名の綴りに応じて上下へ配置されます。",
    ),
    legend,
    canvasWrap,
  );

  main.append(header, previewSection);
  root.replaceChildren(main);

  let frameId = 0;

  function getCanvasSize(): { width: number; height: number } {
    return {
      width: Math.max(1, canvasWrap.clientWidth),
      height: Math.max(1, canvasWrap.clientHeight),
    };
  }

  function render(): void {
    frameId = 0;
    const size = getCanvasSize();
    const scene = createHorizontalScene(song, {
      width: size.width,
      height: size.height,
    });
    const context = resizeCanvasForDisplay(canvas, {
      cssWidth: size.width,
      cssHeight: size.height,
      devicePixelRatio: window.devicePixelRatio || 1,
    });

    canvas.dataset.judgmentLineX = String(scene.judgmentLineX);
    canvas.dataset.noteCount = String(scene.notes.length);
    drawHorizontalScene(context, scene);
  }

  function scheduleRender(): void {
    if (frameId !== 0) {
      return;
    }

    frameId = window.requestAnimationFrame(render);
  }

  function cleanup(): void {
    resizeObserver.disconnect();
    window.removeEventListener("resize", scheduleRender);

    if (frameId !== 0) {
      window.cancelAnimationFrame(frameId);
    }
  }

  const resizeObserver = new ResizeObserver(scheduleRender);
  resizeObserver.observe(canvasWrap);
  window.addEventListener("resize", scheduleRender);

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
