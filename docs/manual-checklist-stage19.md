# 第19段階 手動確認チェックリスト

対象: 教室専用カタログ作成・配置ツール

## 1. 教室コードとcatalogKey

- [ ] `npm.cmd run classroom:hash -- sakura-4832` で `normalizedCode`、64桁の `catalogKey`、`/data/piano-roll-score/classroom-catalogs/{catalogKey}/catalog.json` が表示される。
- [ ] 大文字や全角英数字を含む教室コードが、アプリ側と同じ規則で正規化される。
- [ ] 空文字や不正文字はエラーになる。

## 2. 雛形作成

- [ ] `npm.cmd run classroom:scaffold -- --code ... --name ... --catalog ... --out ...` で `{catalogKey}/catalog.json` と `{catalogKey}/songs/README.md` が作られる。
- [ ] `catalog.json` には `schemaVersion: 1`、`catalogType: "classroom"`、教室名、カタログ名、更新日、空の `songs: []` が入っている。
- [ ] 既存フォルダまたは既存 `catalog.json` を上書きしない。
- [ ] 実データや顧客データをリポジトリ内に作っていない。

## 3. 検証CLI

- [ ] 空の雛形カタログが `npm.cmd run classroom:validate -- ...\catalog.json` でOKになる。
- [ ] `songs[].songUrl` に `javascript:`、`data:`、`file:` を入れるとエラーになる。
- [ ] `./songs/xxx.json` の曲JSONが存在する場合、既存楽曲スキーマで検証される。
- [ ] 曲JSONが壊れている場合、直すべき箇所が分かるエラーになる。
- [ ] カタログ上の `id` と曲JSON内の `id` が違っても、検証CLIでは一致必須にしない。

## 4. 配置確認

- [ ] ローカル公開用ディレクトリの `/public_html/data/piano-roll-score/classroom-catalogs/{catalogKey}/...` に配置できる。
- [ ] アプリで `?classroom=教室コード` を開くと、該当教室カタログを読みに行く。
- [ ] 教室カタログ画面からピアノ表示へ進める。
- [ ] 教室カタログ画面からスコア表示へ進める。
- [ ] スマートフォン幅で横スクロールが出ない。

## 5. 運用上の注意

- [ ] 教室コードはログイン認証ではないことを確認する。
- [ ] 個人情報、秘密情報、権利確認が取れていない教材を置いていない。
- [ ] 公開停止時に削除または退避する `{catalogKey}` フォルダを誤っていない。
- [ ] FTPアップロードや公開用フォルダコピーは、実装スレッドでは行わず、運用手順に従って別途実施する。
