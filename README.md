# piano-roll-score

ピアノ教室での試用を目的とした、縦表示と横表示を切り替えられるピアノロール譜アプリである。

このプロジェクトは現在、第1段階の開発基盤を完了し、第2段階の楽曲スキーマと内蔵データ読み込みを開始する状態にある。譜面表示などの本体機能は後続段階で実装する。

## 目的

主に次の教育的仮説を検証する。

- 楽譜をまだ読めない初心者が、縦表示によって鍵盤と音の位置関係を理解しやすくなるか。
- ゲームに近い表示によって、子供がピアノへ触れる時間を増やせるか。
- 縦表示で練習した課題を横表示でも演奏することで、五線譜への移行を支援できるか。

演奏判定や本格的な楽譜組版は、MVPの対象外である。

## 重要な資料

作業前に次の資料を確認する。

- [AGENTS.md](AGENTS.md)
  - Codexおよび実装担当者向けの作業ルール
- [spec.md](spec.md)
  - 正式な製品仕様
- [docs/project-roadmap.md](docs/project-roadmap.md)
  - 全体の実装順序、現在の進捗、ユーザーの次の行動
- [docs/implementation-plan.md](docs/implementation-plan.md)
  - 現在の実装段階と完了条件
- [_spec.md](_spec.md)
  - 旧仕様書。正式な仕様としては使用しない

仕様に関する判断は `spec.md`、全体進行は `docs/project-roadmap.md`、現在の実装範囲は `docs/implementation-plan.md` を基準とする。

## 採用予定の技術

- Vite
- TypeScript
- HTML
- CSS
- Canvas 2D API
- Web Audio API
- Vitest
- Playwright
- Zod

React、Vue、SvelteなどのUIフレームワークは使用しない。

## 開発環境

現在のローカル環境では次を確認済み。

```text
Node.js v22.22.3
npm 10.9.8
```

Windows PowerShellでは実行ポリシーにより `npm` が起動できない場合がある。その場合は `npm.cmd` を使用する。

例:

```powershell
npm.cmd --version
```

## セットアップ

リポジトリのルートで依存関係をインストールする。

```text
npm install
```

Playwright用ブラウザが未導入の場合は、Chromiumをインストールする。

```text
npx playwright install chromium
```

Windows PowerShellで実行ポリシーにより `npm` や `npx` が起動できない場合は、`npm.cmd` または `npx.cmd` を使用する。

## 開発コマンド

次のnpmスクリプトを利用できる。

```text
npm run dev
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

開発サーバーは、既定では次のURLでアプリを提供する。

```text
http://localhost:5173/app/
```

`npm run test` はVitestの単体テスト、`npm run test:e2e` はPlaywrightのデスクトップ幅・スマートフォン幅のスモークテストを実行する。

## 配置方針

アプリは静的ビルドとして、次のようなサブパスへ配置することを想定する。

```text
https://example.com/app/
```

共有サンプルはアプリに同梱し、次のようなURLから開ける構成を予定している。

```text
https://example.com/app/?id=001
```

専用のアプリケーションサーバーを必要としない構成をMVPの前提とする。

## 進行方法

- 設計スレッドで、仕様、優先順位、共有資料を管理する。
- 実装スレッドは、既存資料を読んでから `docs/implementation-plan.md` の範囲を実装する。
- ユーザーが次に行うことは `docs/project-roadmap.md` と設計スレッドの案内で確認する。
- 実装中に仕様上の問題を発見した場合は、独断で仕様を変更せず、問題点と推奨案を設計スレッドへ返す。
- 合意した仕様変更は、会話だけでなく `spec.md` へ反映する。

## 現在の状態

- 正式仕様書: 作成済み
- Codex向け作業ルール: 作成済み
- 初期実装計画: 作成済み
- Viteプロジェクト: 構築済み
- 第1段階 開発基盤: 完了
- 第2段階 楽曲スキーマと内蔵データ読み込み: 実装開始待ち
- アプリ本体: 一部未実装
- 自動テスト環境: 構築済み
