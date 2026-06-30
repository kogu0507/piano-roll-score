import {
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  formatBeat,
  type PlaybackState,
} from "../core/timeline";
import {
  DEFAULT_METRONOME_VOLUME,
  MAX_METRONOME_VOLUME,
  MIN_METRONOME_VOLUME,
} from "../core/metronome-timing";
import type { PlaybackController } from "../playback/playback-controller";

export interface PlaybackControlsMount {
  readonly element: HTMLElement;
  readonly settingsElement: HTMLDetailsElement;
  readonly cleanup: () => void;
}

export interface PlaybackControlsOptions {
  readonly onSettingsChange?: (state: PlaybackState) => void;
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
    case "precount":
      return "プリカウント中";
    case "playing":
      return "再生中";
    case "paused":
      return "一時停止中";
    case "ended":
      return "終了";
  }
}

function formatDetailedStatus(state: PlaybackState): string {
  if (state.status === "precount") {
    return `状態: プリカウント中（残り${state.precountRemainingBeats}拍）`;
  }

  return `状態: ${formatStatus(state.status)}`;
}

export function mountPlaybackControls(
  controller: PlaybackController,
  className: string,
  options: PlaybackControlsOptions = {},
): PlaybackControlsMount {
  const section = document.createElement("section");
  const primaryControls = document.createElement("div");
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
  const metronomeGroup = document.createElement("div");
  const metronomeLabel = createTextElement(
    "label",
    "playback-control__label",
    "メトロノーム",
  );
  const metronomeInput = document.createElement("input");
  const metronomeState = createTextElement(
    "span",
    "playback-control__value",
    "OFF",
  );
  const volumeGroup = document.createElement("div");
  const volumeLabel = createTextElement(
    "label",
    "playback-control__label",
    "メトロノーム音量",
  );
  const volumeValue = document.createElement("span");
  const volumeOutput = document.createElement("output");
  const volumeInput = document.createElement("input");
  const precountGroup = document.createElement("div");
  const precountLabel = createTextElement(
    "label",
    "playback-control__label",
    "プリカウント",
  );
  const precountSelect = document.createElement("select");
  const status = createTextElement(
    "p",
    "playback-controls__status",
    "停止中",
  );
  const secondaryDetails = document.createElement("details");
  const secondarySummary = createTextElement(
    "summary",
    "playback-controls__secondary-summary",
    "再生補助設定",
  );
  const secondaryContent = document.createElement("div");

  section.className = `playback-controls ${className}`;
  section.setAttribute("aria-label", "再生操作");

  primaryControls.className = "playback-controls__primary";

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

  metronomeInput.id = `${className}-metronome`;
  metronomeInput.type = "checkbox";
  metronomeInput.className = "playback-control__checkbox";
  metronomeLabel.htmlFor = metronomeInput.id;
  metronomeGroup.className = "playback-control playback-control--metronome";
  metronomeGroup.append(metronomeLabel, metronomeState, metronomeInput);

  volumeInput.id = `${className}-metronome-volume`;
  volumeInput.type = "range";
  volumeInput.min = String(MIN_METRONOME_VOLUME * 100);
  volumeInput.max = String(MAX_METRONOME_VOLUME * 100);
  volumeInput.step = "1";
  volumeInput.value = String(Math.round(DEFAULT_METRONOME_VOLUME * 100));
  volumeInput.className = "playback-control__range";
  volumeLabel.htmlFor = volumeInput.id;
  volumeOutput.htmlFor = volumeInput.id;
  volumeValue.className = "playback-control__value";
  volumeValue.append(volumeOutput, document.createTextNode(" %"));
  volumeGroup.className = "playback-control playback-control--volume";
  volumeGroup.append(volumeLabel, volumeValue, volumeInput);

  precountSelect.id = `${className}-precount`;
  precountSelect.className = "playback-control__select";
  [
    ["0", "なし"],
    ["1", "1小節"],
    ["2", "2小節"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    precountSelect.append(option);
  });
  precountLabel.htmlFor = precountSelect.id;
  precountGroup.className = "playback-control playback-control--precount";
  precountGroup.append(precountLabel, precountSelect);

  secondaryDetails.className = "playback-controls__secondary";
  secondaryContent.className = "playback-controls__secondary-content";
  secondaryContent.append(
    speedGroup,
    metronomeGroup,
    volumeGroup,
    precountGroup,
  );
  secondaryDetails.append(secondarySummary, secondaryContent);

  primaryControls.append(buttons, seekGroup, status);
  section.append(primaryControls);

  function update(state: PlaybackState): void {
    const currentBeatText = formatBeat(state.currentBeat);
    const endBeatText = formatBeat(state.endBeat);
    const playbackRateText = formatPlaybackRate(state.playbackRate);

    section.dataset.playbackStatus = state.status;
    section.dataset.currentBeat = currentBeatText;
    section.dataset.endBeat = endBeatText;
    section.dataset.playbackRate = playbackRateText;
    section.dataset.metronomeEnabled = String(state.metronomeEnabled);
    section.dataset.metronomeVolume = String(
      Math.round(state.metronomeVolume * 100),
    );
    section.dataset.precountMeasures = String(state.precountMeasures);
    section.dataset.precountRemainingBeats = String(
      state.precountRemainingBeats,
    );
    startButton.disabled =
      state.status === "playing" || state.status === "precount";
    pauseButton.disabled =
      state.status !== "playing" && state.status !== "precount";
    seekInput.max = endBeatText;
    seekInput.value = currentBeatText;
    seekOutput.value = `${currentBeatText} / ${endBeatText} 拍`;
    seekOutput.textContent = `${currentBeatText} / ${endBeatText} 拍`;
    speedInput.value = playbackRateText;
    speedOutput.value = playbackRateText;
    speedOutput.textContent = playbackRateText;
    metronomeInput.checked = state.metronomeEnabled;
    metronomeState.textContent = state.metronomeEnabled ? "ON" : "OFF";
    volumeInput.value = String(Math.round(state.metronomeVolume * 100));
    volumeOutput.value = String(Math.round(state.metronomeVolume * 100));
    volumeOutput.textContent = String(Math.round(state.metronomeVolume * 100));
    precountSelect.value = String(state.precountMeasures);
    status.textContent = formatDetailedStatus(state);
  }

  const unsubscribe = controller.subscribe(update);

  function notifySettingsChange(): void {
    options.onSettingsChange?.(controller.getSnapshot());
  }

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
    notifySettingsChange();
  });

  metronomeInput.addEventListener("change", () => {
    controller.setMetronomeEnabled(metronomeInput.checked);
    notifySettingsChange();
  });

  volumeInput.addEventListener("input", () => {
    controller.setMetronomeVolume(Number(volumeInput.value) / 100);
    notifySettingsChange();
  });

  precountSelect.addEventListener("change", () => {
    controller.setPrecountMeasures(Number(precountSelect.value));
    notifySettingsChange();
  });

  return {
    element: section,
    settingsElement: secondaryDetails,
    cleanup: unsubscribe,
  };
}
