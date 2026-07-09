# 公開手順

最終更新日: 2026年7月3日

この資料は、MVPを自作ホームページのアプリディレクトリへ配置するための手順である。新機能追加やサーバーAPIの導入は扱わない。

## 1. 想定する公開先

ローカル作業リポジトリ:

```text
C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\projects\piano-roll-score
```

ローカル公開用ディレクトリ:

```text
C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\app\piano-roll-score
```

FTPでのアップロード先:

```text
/public_html/app/piano-roll-score/
```

公開URL:

```text
https://<ドメイン>/app/piano-roll-score/
https://<ドメイン>/app/piano-roll-score/?id=001
```

## 2. ビルド

作業リポジトリで次を実行する。

```text
npm.cmd run build
```

生成される `dist` ディレクトリの中身が公開対象である。

アップロードするもの:

- `dist/index.html`
- `dist/catalog.html`
- `dist/assets/` 以下
- `dist/data/` 以下
- その他、Viteが `dist` に出力したファイル

アップロード不要のもの:

- `src`
- `node_modules`
- `tests`
- `docs`
- `playwright-report`
- `test-results`
- TypeScriptや設定ファイルそのもの

## 3. ローカル公開用ディレクトリへコピーする場合

ローカルでは、`dist` の中身を次へコピーする想定である。

```text
C:\Users\kogu0\Documents\seegmund-music-labo-repositorys\public_html\app\piano-roll-score
```

補助スクリプトを使う場合は、作業リポジトリで次を実行する。

```text
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\copy-dist-to-public.ps1
```

このスクリプトはコピー先が上記パスであることを確認し、`dist` の中身をコピーする。削除は行わない。

古いファイルが残ると、サーバーやローカル公開用ディレクトリに不要ファイルが残る。整理が必要な場合は、削除対象を確認してから手動で行う。ユーザーの古い試作退避ディレクトリである `_piano-roll-score` や `_piano-roll-score-old` は、このアプリの公開作業では削除しない。

## 4. FTPでアップロードする場合

FTPでは、`dist` ディレクトリ自体ではなく、`dist` の中身をサーバー側の次に相当する場所へアップロードする。

```text
/public_html/app/piano-roll-score/
```

このリポジトリではFTPアップロード自体を自動化しない。アップロード前後に、不要な古いファイルが残っていないか確認する。

## 5. キャッシュ方針

Viteが生成するJS/CSSなどのassetsは、通常ハッシュ付きファイル名になる。そのため、ビルドし直した場合は新しいファイル名になり、ブラウザが古いJS/CSSを使い続けにくい。

一方で、次のファイルは同じURLで更新される。

- `index.html`
- `catalog.html`
- `data/songs/index.json`
- `data/songs/*.json`

これらはサーバーやブラウザのキャッシュにより、更新直後に古い内容が使われる可能性がある。内蔵曲JSONの取得処理では `fetch` に `cache: "no-cache"` を指定し、更新確認されやすくしている。ただし、毎回ランダムなクエリを付与するような過剰なキャッシュ破壊は行わない。

`index.html` は通常のページ読み込み対象であり、サーバー設定によっては古いHTMLが残ることがある。公開後に見た目やJS/CSS参照が古い場合は、ブラウザの再読み込み、キャッシュ削除、またはサーバー側のキャッシュ設定を確認する。

端末内保存済みの楽曲はIndexedDBに保存される。サーバー上の内蔵曲JSONを更新しても、利用者が端末内へ保存済みの曲は自動では置き換わらない。重要なデータはJSON書き出しで別途保管する。

教室コードから開く本番用の教室専用カタログは、アプリ本体の `/app/piano-roll-score/` ではなく、サイトルート配下の次のような場所へ置く想定である。

```text
/data/piano-roll-score/classroom-catalogs/{hash}/catalog.json
/data/piano-roll-score/classroom-catalogs/{hash}/songs/001.json
```

この `/data/...` 配下の教室教材は `dist/data/...` とは別管理であり、アプリのビルド成果物へ混ぜない。カタログJSONと曲JSONの取得処理では `cache: "no-cache"` を使うが、サーバーやブラウザのキャッシュで古い教室教材が残る可能性はあるため、更新後は実URLで確認する。

## 6. 公開後の確認

公開後、最低限次を確認する。

1. `https://<ドメイン>/app/piano-roll-score/` が開ける。
2. `https://<ドメイン>/app/piano-roll-score/?id=001` でサンプル曲が選択済みになる。
3. `https://<ドメイン>/app/piano-roll-score/catalog.html` で曲一覧が開ける。
4. catalogにホーム非表示の開発確認曲も含め、全曲が載っている。
5. catalogの「開く」リンクから各曲を開ける。
6. `https://<ドメイン>/app/piano-roll-score/?id=902` のようなホーム非表示曲の直接URLでも開ける。
7. ピアノ表示へ進める。
8. スコア表示へ進める。
9. データ管理を開き、JSON貼り付け、JSONファイル読み込み、JSON書き出し、端末内保存へ到達できる。
10. データ管理から `demo` 教室コードで教室カタログを開ける。
11. 本番用教室カタログを配置する場合は、`/data/piano-roll-score/classroom-catalogs/{hash}/catalog.json` が同一originで取得できる。
12. スマートフォン幅、タブレット幅、PC幅でページ全体に横スクロールが出ない。
13. メトロノームとプリカウントを使う場合は、実機ブラウザで音が出ることを確認する。
