# SDS 履修ガイドブック — タスク管理

## GitHub Pages サイト構築

- [x] `courses.csv` を 2026 年度版に更新
- [x] `courses.md` を 2026 年度版に更新
- [x] 変更履歴 (`changelog.md`, `README.md`) を作成
- [x] `courses.csv` と `courses.md` を同期
- [x] `courses.md` を廃止（`docs/courses.csv` に一本化）
- [x] GitHub Pages サイトを構築（HTML/CSS/JS）
  - [x] `index.html` — ページ構造・ナビゲーション
  - [x] `style.css` — デザイン・レスポンシブ対応
  - [x] `app.js` — CSV 読み込み・科目カード描画
  - [x] フィルタ・検索機能（カテゴリ/キーワード/学年）
  - [x] モーダル（科目詳細・成績分布グラフ）
  - [x] `guide.md` の読み込み・表示
- [x] GitHub Pages デプロイ
- [x] `docs/` フォルダにサイト関連ファイルを整理

## コンテンツ更新（今後）

- [ ] `guide.md` を 2026 年度版に改訂（タイトル等）
- [ ] 科目レビュー・コメントの追加・更新
- [ ] 卒業論文の情報追加

## 仕組み

- `docs/courses.csv` を編集 → push するだけでサイトに自動反映
- JavaScript がクライアント側で CSV を fetch してレンダリング
- ビルドステップ不要
- `docs/guide.md` も同様に自動反映
