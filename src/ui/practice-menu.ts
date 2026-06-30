import {
  createSongFileName,
  createSongJsonBlob,
  startBlobDownload,
} from "../data/import-export";
import { createSavedSongRepository } from "../data/saved-song-repository";
import type { Song } from "../types/song";

interface PracticeMenuOptions {
  readonly song: Song;
  readonly modeDescription: string;
  readonly playbackSettingsElement: HTMLElement;
  readonly legend: HTMLElement;
  readonly switchViewLabel?: string;
  readonly onOpenDisplayAdjustment: () => void;
  readonly onSwitchView?: () => void;
  readonly onReturnToLoadScreen: () => void;
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

function appendFact(list: HTMLDListElement, term: string, value: string): void {
  list.append(
    createTextElement("dt", "practice-menu__fact-term", term),
    createTextElement("dd", "practice-menu__fact-value", value),
  );
}

function createButton(text: string, className = "button"): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  return button;
}

function createMenuSection(title: string): HTMLElement {
  const section = document.createElement("section");
  const heading = createTextElement("h2", "practice-menu__heading", title);

  section.className = "practice-menu__section";
  section.append(heading);

  return section;
}

export function createPracticeMenu({
  song,
  modeDescription,
  playbackSettingsElement,
  legend,
  switchViewLabel,
  onOpenDisplayAdjustment,
  onSwitchView,
  onReturnToLoadScreen,
}: PracticeMenuOptions): HTMLDetailsElement {
  const details = document.createElement("details");
  const summary = createTextElement(
    "summary",
    "practice-menu__summary",
    "☰",
  );
  const content = document.createElement("div");
  const closeButton = createButton("メニューを閉じる", "button button--secondary");
  const displaySection = createMenuSection("表示設定");
  const displayActions = document.createElement("div");
  const openDisplayAdjustmentButton = createButton("表示調整モードを開く");
  const switchViewButton =
    switchViewLabel === undefined ? undefined : createButton(switchViewLabel);
  const songInfoHeading = createTextElement(
    "h3",
    "practice-menu__subheading",
    "曲情報",
  );
  const otherSection = createMenuSection("その他");
  const menuActions = document.createElement("div");
  const saveButton = createButton("端末内に保存");
  const exportButton = createButton("JSONを書き出す");
  const savedListButton = createButton("保存一覧を開く");
  const backButton = createButton("ロード画面へ戻る", "button button--secondary");
  const status = createTextElement(
    "p",
    "practice-menu__status",
    "端末内保存とJSON書き出しは、利用者の操作時だけ実行します。",
  );
  const facts = document.createElement("dl");

  details.className = "practice-menu";
  content.className = "practice-menu__content";
  closeButton.classList.add("practice-menu__close");
  summary.setAttribute("aria-label", "練習メニュー");
  summary.title = "練習メニュー";
  displayActions.className = "practice-menu__actions";
  menuActions.className = "practice-menu__actions";
  facts.className = "practice-menu__facts";
  status.setAttribute("aria-live", "polite");
  saveButton.setAttribute("data-testid", "practice-save-song-button");
  exportButton.setAttribute("data-testid", "practice-export-song-button");
  savedListButton.setAttribute("data-testid", "practice-saved-list-button");

  appendFact(facts, "曲名", song.title);
  appendFact(facts, "BPM", String(song.bpm));
  appendFact(
    facts,
    "拍子",
    `${song.timeSignature.numerator}/${song.timeSignature.denominator}`,
  );
  appendFact(facts, "音符数", `${song.notes.length}件`);

  displayActions.append(openDisplayAdjustmentButton);

  if (switchViewButton !== undefined) {
    displayActions.append(switchViewButton);
  }

  displaySection.append(
    displayActions,
    createTextElement("p", "practice-menu__description", modeDescription),
    legend,
    songInfoHeading,
    facts,
  );

  menuActions.append(saveButton, exportButton, savedListButton, backButton);

  otherSection.append(
    createTextElement(
      "p",
      "practice-menu__description",
      "この端末のこのブラウザ内だけに保存され、別端末には同期されません。重要なデータはJSON書き出しも使ってください。",
    ),
    menuActions,
    status,
    createTextElement(
      "p",
      "practice-menu__description",
      "保存一覧はロード画面にあります。必要なときは「保存一覧を開く」から移動できます。",
    ),
  );

  content.append(
    closeButton,
    playbackSettingsElement,
    displaySection,
    otherSection,
  );
  details.append(summary, content);

  closeButton.addEventListener("click", () => {
    details.open = false;
  });

  details.addEventListener("click", (event) => {
    const target = event.target;

    if (
      !details.open ||
      !(target instanceof Node) ||
      summary.contains(target) ||
      content.contains(target)
    ) {
      return;
    }

    details.open = false;
  });

  openDisplayAdjustmentButton.addEventListener("click", () => {
    details.open = false;
    onOpenDisplayAdjustment();
  });

  switchViewButton?.addEventListener("click", () => {
    details.open = false;
    onSwitchView?.();
  });

  saveButton.addEventListener("click", async () => {
    saveButton.disabled = true;
    status.textContent = "端末内に保存しています。";

    try {
      await createSavedSongRepository().save(song);
      status.textContent =
        "端末内に保存しました。保存一覧はロード画面で確認できます。";
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : "端末内保存に失敗しました。";
    } finally {
      saveButton.disabled = false;
    }
  });

  exportButton.addEventListener("click", () => {
    startBlobDownload(createSongJsonBlob(song), createSongFileName(song));
    status.textContent = "JSONを書き出しました。";
  });

  savedListButton.addEventListener("click", onReturnToLoadScreen);
  backButton.addEventListener("click", onReturnToLoadScreen);

  return details;
}
