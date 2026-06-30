import type { Song } from "../types/song";

interface PracticeMenuOptions {
  readonly song: Song;
  readonly backButton: HTMLButtonElement;
  readonly modeDescription: string;
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

export function createPracticeMenu({
  song,
  backButton,
  modeDescription,
}: PracticeMenuOptions): HTMLDetailsElement {
  const details = document.createElement("details");
  const summary = createTextElement(
    "summary",
    "practice-menu__summary",
    "練習メニュー",
  );
  const content = document.createElement("div");
  const facts = document.createElement("dl");

  details.className = "practice-menu";
  content.className = "practice-menu__content";
  facts.className = "practice-menu__facts";

  appendFact(facts, "曲名", song.title);
  appendFact(facts, "BPM", String(song.bpm));
  appendFact(
    facts,
    "拍子",
    `${song.timeSignature.numerator}/${song.timeSignature.denominator}`,
  );
  appendFact(facts, "音符数", `${song.notes.length}件`);

  content.append(
    createTextElement(
      "p",
      "practice-menu__description",
      "ロード画面へ戻ると、端末内保存、保存一覧、JSON書き出しを操作できます。",
    ),
    backButton,
    createTextElement("p", "practice-menu__description", modeDescription),
    facts,
  );
  details.append(summary, content);

  return details;
}
