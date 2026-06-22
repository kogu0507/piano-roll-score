import { mountApp } from "./app";
import "./styles/main.css";

const root = document.querySelector<HTMLElement>("#app");

if (root === null) {
  throw new Error("アプリのルート要素が見つかりません。");
}

void mountApp(root);
