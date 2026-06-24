import {
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  formatBeat,
  type PlaybackState,
} from "../core/timeline";
import type { PlaybackController } from "../playback/playback-controller";

export interface PlaybackControlsMount {
  readonly element: HTMLElement;
  readonly cleanup: () => void;
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

function formatPlaybackRate(playbackRate: number): string {
  return playbackRate.toFixed(1);
}

function formatStatus(status: PlaybackState["status"]): string {
  switch (status) {
    case "stopped":
      return "停止中";
    case "playing":
      return "再生中";
    case "paused":
      return "一時停止中";
    case "ended":
      return "終了";
  }
}

export function mountPlaybackControls(
  controller: PlaybackController,
  className: string,
): PlaybackControlsMount {
  const section = document.createElement("section");
  const buttons = document.createElement("div");
  const startButton = createButton("スタート", "button button--primary");
  const pauseButton = createButton("一時停止");
  const resetButton = createButton("先頭に戻す");
  const seekGroup = document.createElement("div");
  const seekLabel = createTextElement(
    "label",
    "playback-control__label",
    "曲の現在位置",
  );
  const seekValue = document.createElement("span");
  const seekOutput = document.createElement("output");
  const seekInput = document.createElement("input");
  const speedGroup = document.createElement("div");
  const speedLabel = createTextElement(
    "label",
    "playback-control__label",
    "再生速度",
  );
  const speedValue = document.createElement("span");
  const speedOutput = document.createElement("output");
  const speedInput = document.createElement("input");
  const status = createTextElement(
    "p",
    "playback-controls__status",
    "停止中",
  );

  section.className = `playback-controls ${className}`;
  section.setAttribute("aria-label", "再生操作");

  buttons.className = "playback-controls__buttons";
  buttons.append(startButton, pauseButton, resetButton);

  seekInput.id = `${className}-seek`;
  seekInput.type = "range";
  seekInput.min = "0";
  seekInput.step = "0.01";
  seekInput.className = "playback-control__range";
  seekLabel.htmlFor = seekInput.id;
  seekOutput.htmlFor = seekInput.id;
  seekValue.className = "playback-control__value";
  seekValue.append(seekOutput);
  seekGroup.className = "playback-control playback-control--seek";
  seekGroup.append(seekLabel, seekValue, seekInput);

  speedInput.id = `${className}-playback-rate`;
  speedInput.type = "range";
  speedInput.min = String(MIN_PLAYBACK_RATE);
  speedInput.max = String(MAX_PLAYBACK_RATE);
  speedInput.step = "0.1";
  speedInput.className = "playback-control__range";
  speedLabel.htmlFor = speedInput.id;
  speedOutput.htmlFor = speedInput.id;
  speedValue.className = "playback-control__value";
  speedValue.append(speedOutput, document.createTextNode(" 倍"));
  speedGroup.className = "playback-control playback-control--speed";
  speedGroup.append(speedLabel, speedValue, speedInput);

  section.append(buttons, seekGroup, speedGroup, status);

  function update(state: PlaybackState): void {
    const currentBeatText = formatBeat(state.currentBeat);
    const endBeatText = formatBeat(state.endBeat);
    const playbackRateText = formatPlaybackRate(state.playbackRate);

    section.dataset.playbackStatus = state.status;
    section.dataset.currentBeat = currentBeatText;
    section.dataset.endBeat = endBeatText;
    section.dataset.playbackRate = playbackRateText;
    startButton.disabled = state.status === "playing";
    pauseButton.disabled = state.status !== "playing";
    seekInput.max = endBeatText;
    seekInput.value = currentBeatText;
    seekOutput.value = `${currentBeatText} / ${endBeatText} 拍`;
    seekOutput.textContent = `${currentBeatText} / ${endBeatText} 拍`;
    speedInput.value = playbackRateText;
    speedOutput.value = playbackRateText;
    speedOutput.textContent = playbackRateText;
    status.textContent = `状態: ${formatStatus(state.status)}`;
  }

  const unsubscribe = controller.subscribe(update);

  startButton.addEventListener("click", () => {
    controller.start();
  });

  pauseButton.addEventListener("click", () => {
    controller.pause();
  });

  resetButton.addEventListener("click", () => {
    controller.resetToStart();
  });

  seekInput.addEventListener("input", () => {
    controller.seek(Number(seekInput.value));
  });

  speedInput.addEventListener("input", () => {
    controller.setPlaybackRate(Number(speedInput.value));
  });

  return {
    element: section,
    cleanup: unsubscribe,
  };
}
