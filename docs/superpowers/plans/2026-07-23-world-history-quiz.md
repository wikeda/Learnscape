# 世界史 一問一答アプリ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スマホ向けの世界史一問一答アプリ（4方向スワイプ・習熟度可視化・ローカル保存・GitHub Pages公開）のMVPを構築する。

**Architecture:** Vite + React + TypeScript の静的SPA。ドメインロジック（習熟度の状態機械・出題選択・集計・ストリーク）を純粋関数として切り出しTDDで固め、その上にReactの画面を載せる。永続化は `localStorage`。ルーティングは `HashRouter`（GitHub Pagesでリロード404を避けるため）。グラフは依存を増やさず inline SVG で自作。オフライン/ホーム追加は `vite-plugin-pwa`。

**Tech Stack:** Vite, React 18, TypeScript, React Router (HashRouter), Vitest, @testing-library/react, vite-plugin-pwa。状態管理は React Context + hooks（外部ライブラリなし）。

**設計の出典:** [設計ドキュメント](../specs/2026-07-23-world-history-quiz-design.md)。画面の見た目リファレンスとしてブレストのモックが `C:\Users\500886\temp\.superpowers\brainstorm\695-1784733080\content\*.html` に残っている（実装時の見本として参照可）。

---

## File Structure

```
world-history-quiz/
├─ index.html
├─ package.json
├─ vite.config.ts              # base(リポジトリ名), PWA設定
├─ tsconfig.json
├─ vitest.config.ts
├─ scripts/
│  └─ build-questions.mjs      # data/questions.csv → src/data/questions.json 変換(206章補完)
├─ data/
│  └─ questions.csv            # スプレッドシートのCSVエクスポート(手動配置)
├─ src/
│  ├─ main.tsx                 # エントリ, HashRouter, AppDataProvider
│  ├─ App.tsx                  # ルート定義
│  ├─ data/
│  │  └─ questions.json        # 変換生成物(コミットする)
│  ├─ domain/                  # ★純粋ロジック(TDD対象)
│  │  ├─ types.ts
│  │  ├─ mastery.ts            # 状態遷移
│  │  ├─ aggregate.ts          # 章/全体の集計・習熟度%
│  │  ├─ session.ts            # 出題選択
│  │  ├─ streak.ts             # 連続学習日数
│  │  └─ colors.ts             # 習熟度→色
│  ├─ storage/
│  │  ├─ schema.ts             # AppDataの既定値・バージョン
│  │  └─ storage.ts            # load/save/export/import
│  ├─ state/
│  │  └─ AppDataContext.tsx    # Context + reducer, localStorage連携
│  ├─ hooks/
│  │  └─ useQuestions.ts       # questions.json読み込み
│  ├─ theme/
│  │  └─ theme.css             # CSS変数(ライト/ダーク/アクセント)
│  ├─ components/
│  │  ├─ TabBar.tsx            # 3タブ(ホーム/成績/設定)
│  │  ├─ Flashcard.tsx         # 4方向スワイプ+絞り
│  │  ├─ StackedBarChart.tsx   # 章の伸び(積層棒)
│  │  ├─ MasteryRing.tsx       # 全体習熟度リング
│  │  └─ Confetti.tsx          # 紙吹雪8つ
│  └─ screens/
│     ├─ HomeScreen.tsx        # 習熟マップ
│     ├─ StatsScreen.tsx       # 成績
│     ├─ SettingsScreen.tsx    # 設定
│     ├─ ChapterDetailScreen.tsx
│     ├─ StudyScreen.tsx       # 出題セッション
│     └─ ResultScreen.tsx      # リザルト
└─ public/
   └─ icons/ (PWAアイコン)
```

各タスクは上から順に依存する。ドメイン層(Task 4–9)を先に固め、画面(Task 12–19)で組み上げる。

---

## Task 1: プロジェクト雛形とテスト環境

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: Vite React-TS プロジェクトを作成**

作業ディレクトリ `world-history-quiz/` で実行（既存の `docs/`, `.git` はそのまま）:

```bash
cd world-history-quiz
npm create vite@latest . -- --template react-ts
# 既存ファイルがある場合は上書きせず続行を選択。競合したら手動でマージ。
npm install
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install react-router-dom
```

- [ ] **Step 2: `vitest.config.ts` を作成**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 3: `src/test-setup.ts` を作成**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: `package.json` の scripts を確認/追記**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "questions": "node scripts/build-questions.mjs"
  }
}
```

- [ ] **Step 5: `vite.config.ts` に base を設定**

GitHub Pages のプロジェクトページ（`https://<user>.github.io/world-history-quiz/`）を想定し `base` を設定:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/world-history-quiz/',
  plugins: [react()],
});
```

- [ ] **Step 6: スモークテストを作成 `src/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
describe('smoke', () => {
  it('runs', () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 7: テスト実行**

Run: `npm test`
Expected: PASS（1 passed）

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React TS project with vitest"
```

---

## Task 2: 問題データの変換（CSV → JSON, 206章補完）

**Files:**
- Create: `scripts/build-questions.mjs`, `data/questions.csv`（手動配置）, `src/data/questions.json`（生成）

- [ ] **Step 1: スプレッドシートをCSVで書き出す**

Google スプレッドシートを開き `ファイル > ダウンロード > カンマ区切り値(.csv)` を選択。保存したファイルを `data/questions.csv` に配置する。1行目はヘッダ（先頭に空行や空列が含まれる場合がある）。列は `No, チャプター, 質問, 解答`。

- [ ] **Step 2: 変換スクリプトを作成 `scripts/build-questions.mjs`**

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SRC = 'data/questions.csv';
const OUT = 'src/data/questions.json';

// 素朴なCSVパーサ（ダブルクオート対応, カンマ/改行をクオート内で許容）
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(SRC, 'utf8');
const rows = parseCsv(raw).filter((r) => r.some((c) => c.trim() !== ''));

// ヘッダ行(No/チャプター/質問/解答 を含む行)を検出
const headerIdx = rows.findIndex((r) => r.map((c) => c.trim()).includes('質問'));
if (headerIdx === -1) throw new Error('ヘッダ行(質問)が見つかりません');
const header = rows[headerIdx].map((c) => c.trim());
const col = (name) => header.indexOf(name);
const iNo = col('No'), iCh = col('チャプター'), iQ = col('質問'), iA = col('解答');

let lastChapter = '';
const out = [];
for (let i = headerIdx + 1; i < rows.length; i++) {
  const r = rows[i];
  const no = parseInt((r[iNo] || '').trim(), 10);
  const question = (r[iQ] || '').trim();
  const answer = (r[iA] || '').trim();
  let chapter = (r[iCh] || '').trim();
  if (!question || !answer || Number.isNaN(no)) continue;
  // 章が空欄(例:No.206)なら直前の章で補完
  if (!chapter) chapter = lastChapter;
  else lastChapter = chapter;
  out.push({ no, chapter, question, answer });
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');

const chapters = [...new Set(out.map((q) => q.chapter))];
console.log(`questions: ${out.length}, chapters: ${chapters.length}`);
console.log(chapters.join(' / '));
```

- [ ] **Step 3: 変換を実行**

Run: `npm run questions`
Expected: `questions: 847, chapters: 27`（問題数847・章27。数が違う場合はCSVの列位置/空行を確認）

- [ ] **Step 4: 生成物の妥当性を軽く確認**

Run: `node -e "const q=require('./src/data/questions.json'); console.log(q.find(x=>x.no===206))"`
Expected: `No.206` の `chapter` が `中世ヨーロッパ` になっている（空欄でない）

- [ ] **Step 5: Commit**

```bash
git add scripts/build-questions.mjs src/data/questions.json data/questions.csv
git commit -m "feat: convert question spreadsheet to bundled JSON (fill empty chapter 206)"
```

---

## Task 3: ドメイン型定義

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: 型を定義 `src/domain/types.ts`**

```ts
export interface Question {
  no: number;
  chapter: string;
  question: string;
  answer: string;
}

/** 習熟度4状態 */
export type MasteryState = 'unanswered' | 'failed' | 'unsure' | 'mastered';

/** スワイプ判定: 右=known / 上=unsure / 左=failed（下=絞りは判定ではない） */
export type SwipeResult = 'known' | 'unsure' | 'failed';

export interface QuestionProgress {
  no: number;
  state: MasteryState;
  /** 「覚えた」の連続回数 */
  knownStreak: number;
  lastStudiedAt: number | null;
}

export interface Counts {
  mastered: number;
  unsure: number;
  failed: number;
  unanswered: number;
}

/** 章を1周した記録（積層棒グラフ用） */
export interface RoundRecord {
  round: number;
  timestamp: number;
  counts: Counts;
  masteryPct: number;
}

export interface Streak {
  current: number;
  longest: number;
  lastStudyDate: string | null; // 'YYYY-MM-DD'
  studyDates: string[];
}

export type Theme = 'light' | 'dark' | 'system';
export type Order = 'sequential' | 'random';
/** 0 = 制限なし */
export type SessionSize = 0 | 10 | 20 | 30;
export type MasterThreshold = 1 | 2;

export interface Settings {
  theme: Theme;
  accent: string;       // CSS color
  order: Order;
  sessionSize: SessionSize;
  masterThreshold: MasterThreshold;
  soundEnabled: boolean;
  hapticEnabled: boolean;
}

export interface AppData {
  version: number;
  progress: Record<number, QuestionProgress>;   // key: question.no
  chapterRounds: Record<string, RoundRecord[]>; // key: chapter名
  streak: Streak;
  settings: Settings;
}
```

- [ ] **Step 2: 型のみなのでコンパイル確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat: add domain types"
```

---

## Task 4: 習熟度の状態遷移（mastery.ts）

**Files:**
- Create: `src/domain/mastery.ts`, `src/domain/mastery.test.ts`

- [ ] **Step 1: 失敗するテストを書く `src/domain/mastery.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { applySwipe, initialProgress } from './mastery';

const base = initialProgress(1);

describe('applySwipe', () => {
  it('failed にすると state=failed, streak=0', () => {
    const r = applySwipe(base, 'failed', 2, 1000);
    expect(r.state).toBe('failed');
    expect(r.knownStreak).toBe(0);
    expect(r.lastStudiedAt).toBe(1000);
  });

  it('unsure にすると state=unsure, streak=0', () => {
    const r = applySwipe({ ...base, knownStreak: 1 }, 'unsure', 2, 1);
    expect(r.state).toBe('unsure');
    expect(r.knownStreak).toBe(0);
  });

  it('threshold=2: known 1回目はまだ unsure（あと1回）', () => {
    const r = applySwipe(base, 'known', 2, 1);
    expect(r.knownStreak).toBe(1);
    expect(r.state).toBe('unsure');
  });

  it('threshold=2: known 2回連続で mastered', () => {
    const r1 = applySwipe(base, 'known', 2, 1);
    const r2 = applySwipe(r1, 'known', 2, 2);
    expect(r2.knownStreak).toBe(2);
    expect(r2.state).toBe('mastered');
  });

  it('threshold=1: known 1回で mastered', () => {
    const r = applySwipe(base, 'known', 1, 1);
    expect(r.state).toBe('mastered');
  });

  it('mastered を failed で叩くと failed に戻り streak リセット', () => {
    const mastered = { no: 1, state: 'mastered' as const, knownStreak: 2, lastStudiedAt: 1 };
    const r = applySwipe(mastered, 'failed', 2, 5);
    expect(r.state).toBe('failed');
    expect(r.knownStreak).toBe(0);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npx vitest run src/domain/mastery.test.ts`
Expected: FAIL（`applySwipe`/`initialProgress` 未定義）

- [ ] **Step 3: 実装 `src/domain/mastery.ts`**

```ts
import { QuestionProgress, SwipeResult, MasterThreshold } from './types';

export function initialProgress(no: number): QuestionProgress {
  return { no, state: 'unanswered', knownStreak: 0, lastStudiedAt: null };
}

export function applySwipe(
  p: QuestionProgress,
  result: SwipeResult,
  threshold: MasterThreshold,
  now: number,
): QuestionProgress {
  if (result === 'known') {
    const knownStreak = p.knownStreak + 1;
    const state = knownStreak >= threshold ? 'mastered' : 'unsure';
    return { ...p, state, knownStreak, lastStudiedAt: now };
  }
  if (result === 'unsure') {
    return { ...p, state: 'unsure', knownStreak: 0, lastStudiedAt: now };
  }
  // failed
  return { ...p, state: 'failed', knownStreak: 0, lastStudiedAt: now };
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `npx vitest run src/domain/mastery.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/mastery.ts src/domain/mastery.test.ts
git commit -m "feat: mastery state machine (known x2 => mastered)"
```

---

## Task 5: 集計と習熟度%（aggregate.ts）

**Files:**
- Create: `src/domain/aggregate.ts`, `src/domain/aggregate.test.ts`

- [ ] **Step 1: 失敗するテストを書く `src/domain/aggregate.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { countStates, masteryPct, overallMastery } from './aggregate';
import { Question, QuestionProgress } from './types';

const qs: Question[] = [
  { no: 1, chapter: 'A', question: 'q', answer: 'a' },
  { no: 2, chapter: 'A', question: 'q', answer: 'a' },
  { no: 3, chapter: 'A', question: 'q', answer: 'a' },
  { no: 4, chapter: 'B', question: 'q', answer: 'a' },
];
const prog: Record<number, QuestionProgress> = {
  1: { no: 1, state: 'mastered', knownStreak: 2, lastStudiedAt: 1 },
  2: { no: 2, state: 'unsure', knownStreak: 0, lastStudiedAt: 1 },
  // 3 は未登録 → unanswered 扱い
};

describe('aggregate', () => {
  it('countStates: 章Aの内訳', () => {
    const c = countStates(qs, prog, 'A');
    expect(c).toEqual({ mastered: 1, unsure: 1, failed: 0, unanswered: 1 });
  });

  it('masteryPct: 1/3 = 33%（四捨五入）', () => {
    const c = countStates(qs, prog, 'A');
    expect(masteryPct(c)).toBe(33);
  });

  it('masteryPct: 母数0なら0', () => {
    expect(masteryPct({ mastered: 0, unsure: 0, failed: 0, unanswered: 0 })).toBe(0);
  });

  it('overallMastery: 全4問中マスター1 → 25%, mastered数', () => {
    const r = overallMastery(qs, prog);
    expect(r.pct).toBe(25);
    expect(r.mastered).toBe(1);
    expect(r.total).toBe(4);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npx vitest run src/domain/aggregate.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 3: 実装 `src/domain/aggregate.ts`**

```ts
import { Question, QuestionProgress, Counts, MasteryState } from './types';

function stateOf(prog: Record<number, QuestionProgress>, no: number): MasteryState {
  return prog[no]?.state ?? 'unanswered';
}

export function countStates(
  questions: Question[],
  prog: Record<number, QuestionProgress>,
  chapter: string,
): Counts {
  const c: Counts = { mastered: 0, unsure: 0, failed: 0, unanswered: 0 };
  for (const q of questions) {
    if (q.chapter !== chapter) continue;
    c[stateOf(prog, q.no)]++;
  }
  return c;
}

export function masteryPct(c: Counts): number {
  const total = c.mastered + c.unsure + c.failed + c.unanswered;
  if (total === 0) return 0;
  return Math.round((c.mastered / total) * 100);
}

export function overallMastery(
  questions: Question[],
  prog: Record<number, QuestionProgress>,
): { pct: number; mastered: number; total: number } {
  const total = questions.length;
  const mastered = questions.filter((q) => stateOf(prog, q.no) === 'mastered').length;
  return { pct: total === 0 ? 0 : Math.round((mastered / total) * 100), mastered, total };
}

export function chapterList(questions: Question[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of questions) if (!seen.has(q.chapter)) { seen.add(q.chapter); out.push(q.chapter); }
  return out;
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `npx vitest run src/domain/aggregate.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/aggregate.ts src/domain/aggregate.test.ts
git commit -m "feat: state counts and mastery percentage aggregation"
```

---

## Task 6: 出題選択ロジック（session.ts）

**Files:**
- Create: `src/domain/session.ts`, `src/domain/session.test.ts`

出題方針（設計より）: 「この章を学習」＝未マスター中心＋たまにマスター。「あやふや◯問だけ」＝unsureのみ。順番/ランダム・セッション問題数を反映。ランダムはテスト可能にするため乱数を注入する。

- [ ] **Step 1: 失敗するテストを書く `src/domain/session.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildChapterSession, buildUnsureSession } from './session';
import { Question, QuestionProgress } from './types';

const qs: Question[] = Array.from({ length: 10 }, (_, i) => ({
  no: i + 1, chapter: 'A', question: `q${i + 1}`, answer: 'a',
}));

function prog(map: Record<number, QuestionProgress['state']>): Record<number, QuestionProgress> {
  const p: Record<number, QuestionProgress> = {};
  for (const [no, state] of Object.entries(map)) {
    p[+no] = { no: +no, state, knownStreak: 0, lastStudiedAt: 1 };
  }
  return p;
}

describe('buildChapterSession', () => {
  it('未マスター中心（マスターは母集団の主役でない）', () => {
    const p = prog({ 1: 'mastered', 2: 'mastered', 3: 'unsure', 4: 'failed' });
    // 5..10 は unanswered
    const s = buildChapterSession(qs, p, 'A', {
      order: 'sequential', sessionSize: 0, maintenanceRatio: 0,
    });
    // maintenanceRatio=0 なので mastered は含まれない
    expect(s.map((q) => q.no)).not.toContain(1);
    expect(s.map((q) => q.no)).not.toContain(2);
    // 未マスター8問すべて
    expect(s).toHaveLength(8);
  });

  it('sequential は no 昇順', () => {
    const p = prog({});
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 0, maintenanceRatio: 0 });
    expect(s.map((q) => q.no)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });

  it('sessionSize で上限を切る', () => {
    const p = prog({});
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 3, maintenanceRatio: 0 });
    expect(s).toHaveLength(3);
  });

  it('maintenanceRatio>0 でマスターを少量混ぜる', () => {
    const p = prog({ 1: 'mastered', 2: 'mastered', 3: 'mastered', 4: 'unsure', 5: 'failed' });
    // 未マスター: 4,5,6,7,8,9,10 = 7問, ratio 0.3 → floor(7*0.3)=2 のmasteredを追加
    const s = buildChapterSession(qs, p, 'A', { order: 'sequential', sessionSize: 0, maintenanceRatio: 0.3 });
    const masteredIncluded = s.filter((q) => [1,2,3].includes(q.no)).length;
    expect(masteredIncluded).toBe(2);
    expect(s).toHaveLength(9);
  });

  it('random は注入した rng で決定的に', () => {
    const p = prog({});
    const rng = () => 0; // 常に0 → 安定ソート的挙動
    const s = buildChapterSession(qs, p, 'A', { order: 'random', sessionSize: 0, maintenanceRatio: 0, rng });
    expect(s).toHaveLength(10);
  });
});

describe('buildUnsureSession', () => {
  it('unsure のみ', () => {
    const p = prog({ 1: 'unsure', 2: 'failed', 3: 'unsure', 4: 'mastered' });
    const s = buildUnsureSession(qs, p, 'A', { order: 'sequential', sessionSize: 0 });
    expect(s.map((q) => q.no).sort()).toEqual([1, 3]);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npx vitest run src/domain/session.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 3: 実装 `src/domain/session.ts`**

```ts
import { Question, QuestionProgress, Order, MasteryState } from './types';

function stateOf(prog: Record<number, QuestionProgress>, no: number): MasteryState {
  return prog[no]?.state ?? 'unanswered';
}

function orderQuestions(list: Question[], order: Order, rng: () => number): Question[] {
  if (order === 'sequential') return [...list].sort((a, b) => a.no - b.no);
  // random: Fisher–Yates（rng注入で決定的）
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface ChapterSessionOpts {
  order: Order;
  sessionSize: number; // 0 = 制限なし
  maintenanceRatio: number; // 未マスター数に対するマスター混入比
  rng?: () => number;
}

export function buildChapterSession(
  questions: Question[],
  prog: Record<number, QuestionProgress>,
  chapter: string,
  opts: ChapterSessionOpts,
): Question[] {
  const rng = opts.rng ?? Math.random;
  const inChapter = questions.filter((q) => q.chapter === chapter);
  const unmastered = inChapter.filter((q) => stateOf(prog, q.no) !== 'mastered');
  const mastered = inChapter.filter((q) => stateOf(prog, q.no) === 'mastered');

  // マスターは最終学習が古い順に少量混ぜる（定着確認）
  const maintainCount = Math.floor(unmastered.length * opts.maintenanceRatio);
  const maintain = [...mastered]
    .sort((a, b) => (prog[a.no]?.lastStudiedAt ?? 0) - (prog[b.no]?.lastStudiedAt ?? 0))
    .slice(0, maintainCount);

  let pool = orderQuestions([...unmastered, ...maintain], opts.order, rng);
  if (opts.sessionSize > 0) pool = pool.slice(0, opts.sessionSize);
  return pool;
}

export interface UnsureSessionOpts { order: Order; sessionSize: number; rng?: () => number; }

export function buildUnsureSession(
  questions: Question[],
  prog: Record<number, QuestionProgress>,
  chapter: string,
  opts: UnsureSessionOpts,
): Question[] {
  const rng = opts.rng ?? Math.random;
  const unsure = questions.filter((q) => q.chapter === chapter && stateOf(prog, q.no) === 'unsure');
  let pool = orderQuestions(unsure, opts.order, rng);
  if (opts.sessionSize > 0) pool = pool.slice(0, opts.sessionSize);
  return pool;
}

/** リザルトの「できなかった◯問だけ」用: 指定noのみ抽出 */
export function pickByNumbers(questions: Question[], nos: number[]): Question[] {
  const set = new Set(nos);
  return questions.filter((q) => set.has(q.no)).sort((a, b) => a.no - b.no);
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `npx vitest run src/domain/session.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/session.ts src/domain/session.test.ts
git commit -m "feat: session builder (unmastered-first + maintenance, unsure-only)"
```

---

## Task 7: ストリーク（streak.ts）

**Files:**
- Create: `src/domain/streak.ts`, `src/domain/streak.test.ts`

- [ ] **Step 1: 失敗するテストを書く `src/domain/streak.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { recordStudyDay, emptyStreak } from './streak';

describe('recordStudyDay', () => {
  it('初回で current=1, longest=1', () => {
    const r = recordStudyDay(emptyStreak(), '2026-07-23');
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.lastStudyDate).toBe('2026-07-23');
  });

  it('同日はもう一度呼んでも変化なし', () => {
    const a = recordStudyDay(emptyStreak(), '2026-07-23');
    const b = recordStudyDay(a, '2026-07-23');
    expect(b.current).toBe(1);
    expect(b.studyDates).toEqual(['2026-07-23']);
  });

  it('翌日で current+1', () => {
    const a = recordStudyDay(emptyStreak(), '2026-07-23');
    const b = recordStudyDay(a, '2026-07-24');
    expect(b.current).toBe(2);
    expect(b.longest).toBe(2);
  });

  it('間が空くと current=1 に戻る（longestは保持）', () => {
    let s = recordStudyDay(emptyStreak(), '2026-07-23');
    s = recordStudyDay(s, '2026-07-24'); // current2
    s = recordStudyDay(s, '2026-07-27'); // 途切れ
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npx vitest run src/domain/streak.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 3: 実装 `src/domain/streak.ts`**

```ts
import { Streak } from './types';

export function emptyStreak(): Streak {
  return { current: 0, longest: 0, lastStudyDate: null, studyDates: [] };
}

/** 'YYYY-MM-DD' の前日を返す */
function prevDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function recordStudyDay(streak: Streak, today: string): Streak {
  if (streak.lastStudyDate === today) return streak; // 同日は変化なし
  let current: number;
  if (streak.lastStudyDate === prevDay(today)) current = streak.current + 1;
  else current = 1;
  const longest = Math.max(streak.longest, current);
  const studyDates = streak.studyDates.includes(today)
    ? streak.studyDates
    : [...streak.studyDates, today];
  return { current, longest, lastStudyDate: today, studyDates };
}

/** ローカル日付を 'YYYY-MM-DD' で返す */
export function todayStr(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `npx vitest run src/domain/streak.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/streak.ts src/domain/streak.test.ts
git commit -m "feat: study streak logic"
```

---

## Task 8: 習熟度→色（colors.ts）

**Files:**
- Create: `src/domain/colors.ts`, `src/domain/colors.test.ts`

- [ ] **Step 1: 失敗するテストを書く `src/domain/colors.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { masteryColor, STATE_COLORS } from './colors';

describe('masteryColor', () => {
  it('境界値', () => {
    expect(masteryColor(0)).toBe('#c9ccd6');   // 灰
    expect(masteryColor(1)).toBe('#e5736b');   // 赤
    expect(masteryColor(25)).toBe('#e5736b');
    expect(masteryColor(26)).toBe('#f0993c');  // 橙
    expect(masteryColor(50)).toBe('#f0993c');
    expect(masteryColor(51)).toBe('#9cc93f');  // 黄緑
    expect(masteryColor(75)).toBe('#9cc93f');
    expect(masteryColor(76)).toBe('#3f9e5a');  // 緑
    expect(masteryColor(99)).toBe('#3f9e5a');
    expect(masteryColor(100)).toBe('#e3b23c'); // 金
  });
});

describe('STATE_COLORS', () => {
  it('4状態の色', () => {
    expect(STATE_COLORS.mastered).toBe('#3f9e5a');
    expect(STATE_COLORS.unsure).toBe('#e6b800');
    expect(STATE_COLORS.failed).toBe('#e5736b');
    expect(STATE_COLORS.unanswered).toBe('#c9ccd6');
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npx vitest run src/domain/colors.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装 `src/domain/colors.ts`**

```ts
import { MasteryState } from './types';

export function masteryColor(pct: number): string {
  if (pct >= 100) return '#e3b23c'; // 金
  if (pct >= 76) return '#3f9e5a';  // 緑
  if (pct >= 51) return '#9cc93f';  // 黄緑
  if (pct >= 26) return '#f0993c';  // 橙
  if (pct >= 1) return '#e5736b';   // 赤
  return '#c9ccd6';                 // 灰
}

export const STATE_COLORS: Record<MasteryState, string> = {
  mastered: '#3f9e5a',
  unsure: '#e6b800',
  failed: '#e5736b',
  unanswered: '#c9ccd6',
};
```

- [ ] **Step 4: 実行して成功を確認**

Run: `npx vitest run src/domain/colors.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/colors.ts src/domain/colors.test.ts
git commit -m "feat: mastery/state color mapping"
```

---

## Task 9: 永続化（schema.ts / storage.ts）

**Files:**
- Create: `src/storage/schema.ts`, `src/storage/storage.ts`, `src/storage/storage.test.ts`

- [ ] **Step 1: 既定値 `src/storage/schema.ts`**

```ts
import { AppData, Settings } from '../domain/types';
import { emptyStreak } from '../domain/streak';

export const DATA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  accent: '#3b6cff',
  order: 'sequential',
  sessionSize: 0,        // 制限なし
  masterThreshold: 2,
  soundEnabled: false,
  hapticEnabled: true,
};

export function defaultAppData(): AppData {
  return {
    version: DATA_VERSION,
    progress: {},
    chapterRounds: {},
    streak: emptyStreak(),
    settings: { ...DEFAULT_SETTINGS },
  };
}
```

- [ ] **Step 2: 失敗するテストを書く `src/storage/storage.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppData, saveAppData, exportJson, importJson } from './storage';
import { defaultAppData } from './schema';

beforeEach(() => localStorage.clear());

describe('storage', () => {
  it('空なら既定を返す', () => {
    const d = loadAppData();
    expect(d.version).toBe(1);
    expect(d.settings.sessionSize).toBe(0);
  });

  it('保存→読み込みで往復', () => {
    const d = defaultAppData();
    d.progress[1] = { no: 1, state: 'mastered', knownStreak: 2, lastStudiedAt: 5 };
    saveAppData(d);
    expect(loadAppData().progress[1].state).toBe('mastered');
  });

  it('欠けたキーは既定でマージ', () => {
    localStorage.setItem('whq:data', JSON.stringify({ version: 1, progress: {} }));
    const d = loadAppData();
    expect(d.settings).toBeDefined();
    expect(d.streak.current).toBe(0);
  });

  it('export→import で復元', () => {
    const d = defaultAppData();
    d.streak.current = 7;
    const json = exportJson(d);
    const restored = importJson(json);
    expect(restored.streak.current).toBe(7);
  });

  it('壊れたJSONのimportは例外', () => {
    expect(() => importJson('{not json')).toThrow();
  });
});
```

- [ ] **Step 3: 実行して失敗を確認**

Run: `npx vitest run src/storage/storage.test.ts`
Expected: FAIL（未定義）

- [ ] **Step 4: 実装 `src/storage/storage.ts`**

```ts
import { AppData } from '../domain/types';
import { defaultAppData, DEFAULT_SETTINGS, DATA_VERSION } from './schema';

const KEY = 'whq:data';

function mergeDefaults(raw: Partial<AppData>): AppData {
  const base = defaultAppData();
  return {
    version: DATA_VERSION,
    progress: raw.progress ?? base.progress,
    chapterRounds: raw.chapterRounds ?? base.chapterRounds,
    streak: { ...base.streak, ...(raw.streak ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
  };
}

export function loadAppData(): AppData {
  const s = localStorage.getItem(KEY);
  if (!s) return defaultAppData();
  try {
    return mergeDefaults(JSON.parse(s));
  } catch {
    return defaultAppData();
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importJson(json: string): AppData {
  const parsed = JSON.parse(json); // 不正なら例外を投げる
  return mergeDefaults(parsed);
}
```

- [ ] **Step 5: 実行して成功を確認**

Run: `npx vitest run src/storage/storage.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/storage/
git commit -m "feat: localStorage persistence with defaults merge + export/import"
```

---

## Task 10: アプリ状態Context（AppDataContext）

**Files:**
- Create: `src/state/AppDataContext.tsx`, `src/hooks/useQuestions.ts`, `src/state/AppDataContext.test.tsx`

- [ ] **Step 1: 問題読み込みフック `src/hooks/useQuestions.ts`**

```ts
import questionsJson from '../data/questions.json';
import { Question } from '../domain/types';

const QUESTIONS = questionsJson as Question[];

export function useQuestions(): Question[] {
  return QUESTIONS;
}
```

`tsconfig.json` に `"resolveJsonModule": true` が無ければ追加する。

- [ ] **Step 2: 失敗するテストを書く `src/state/AppDataContext.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppDataProvider, useAppData } from './AppDataContext';

beforeEach(() => localStorage.clear());

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppDataProvider>{children}</AppDataProvider>
);

describe('AppDataContext', () => {
  it('recordAnswer で progress と streak が更新される', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    act(() => { result.current.recordAnswer(1, 'known'); });
    expect(result.current.data.progress[1].knownStreak).toBe(1);
    expect(result.current.data.streak.current).toBe(1);
  });

  it('updateSettings が反映され永続化される', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    act(() => { result.current.updateSettings({ order: 'random' }); });
    expect(result.current.data.settings.order).toBe('random');
    expect(JSON.parse(localStorage.getItem('whq:data')!).settings.order).toBe('random');
  });
});
```

- [ ] **Step 3: 実行して失敗を確認**

Run: `npx vitest run src/state/AppDataContext.test.tsx`
Expected: FAIL（未定義）

- [ ] **Step 4: 実装 `src/state/AppDataContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { AppData, Settings, SwipeResult } from '../domain/types';
import { loadAppData, saveAppData } from '../storage/storage';
import { applySwipe, initialProgress } from '../domain/mastery';
import { recordStudyDay, todayStr } from '../domain/streak';

type Action =
  | { type: 'answer'; no: number; result: SwipeResult }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; data: AppData };

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'answer': {
      const prev = state.progress[action.no] ?? initialProgress(action.no);
      const next = applySwipe(prev, action.result, state.settings.masterThreshold, Date.now());
      return {
        ...state,
        progress: { ...state.progress, [action.no]: next },
        streak: recordStudyDay(state.streak, todayStr()),
      };
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'replace':
      return action.data;
    default:
      return state;
  }
}

interface Ctx {
  data: AppData;
  recordAnswer: (no: number, result: SwipeResult) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceData: (data: AppData) => void;
}

const AppDataCtx = createContext<Ctx | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined as unknown as AppData, loadAppData);

  useEffect(() => { saveAppData(data); }, [data]);

  const value = useMemo<Ctx>(() => ({
    data,
    recordAnswer: (no, result) => dispatch({ type: 'answer', no, result }),
    updateSettings: (patch) => dispatch({ type: 'settings', patch }),
    replaceData: (d) => dispatch({ type: 'replace', data: d }),
  }), [data]);

  return <AppDataCtx.Provider value={value}>{children}</AppDataCtx.Provider>;
}

export function useAppData(): Ctx {
  const c = useContext(AppDataCtx);
  if (!c) throw new Error('useAppData must be used within AppDataProvider');
  return c;
}
```

> 章の周回記録（`chapterRounds`）はセッション終了時にまとめて追加する。Task 15（StudyScreen）で `recordRound` アクションを足す。ここでは回答・設定・置換のみ。

- [ ] **Step 5: 実行して成功を確認**

Run: `npx vitest run src/state/AppDataContext.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/state/ src/hooks/
git commit -m "feat: app data context (answers, settings, persistence)"
```

---

## Task 11: テーマCSSとアプリシェル（TabBar / ルーティング）

**Files:**
- Create: `src/theme/theme.css`, `src/components/TabBar.tsx`
- Modify: `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: `src/theme/theme.css`（CSS変数・ライト/ダーク）**

```css
:root {
  --bg: #f4f6fa;
  --surface: #ffffff;
  --text: #1c2333;
  --muted: #8a93a6;
  --border: #eef1f6;
  --accent: #3b6cff;         /* 設定で上書き */
  --shadow: 0 2px 8px rgba(0,0,0,.05);
}
:root[data-theme='dark'] {
  --bg: #1b2032;
  --surface: #262c40;
  --text: #eef1f6;
  --muted: #9aa3b8;
  --border: #333a52;
  --shadow: 0 2px 8px rgba(0,0,0,.3);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text);
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
.app { max-width: 480px; margin: 0 auto; min-height: 100vh; position: relative;
  padding-bottom: 60px; }
.tabbar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 480px; height: 56px; background: var(--surface);
  border-top: 1px solid var(--border); display: flex; }
.tabbar a { flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; font-size: 11px; color: var(--muted); text-decoration: none; gap: 2px; }
.tabbar a.active { color: var(--accent); font-weight: 700; }
.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: 15px;
  padding: 14px; font-weight: 800; font-size: 15px; width: 100%; }
```

- [ ] **Step 2: `src/components/TabBar.tsx`**

```tsx
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/stats', label: '成績', icon: '📊' },
  { to: '/settings', label: '設定', icon: '⚙️' },
];

export function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'}
          className={({ isActive }) => (isActive ? 'active' : '')}>
          <span>{t.icon}</span><span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: `src/App.tsx`（ルート定義・没入フローはTabBar非表示）**

```tsx
import { Routes, Route, useLocation } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { HomeScreen } from './screens/HomeScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ChapterDetailScreen } from './screens/ChapterDetailScreen';
import { StudyScreen } from './screens/StudyScreen';
import { ResultScreen } from './screens/ResultScreen';

const IMMERSIVE = [/^\/study/, /^\/result/, /^\/chapter\//];

export default function App() {
  const { pathname } = useLocation();
  const immersive = IMMERSIVE.some((re) => re.test(pathname));
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/chapter/:chapter" element={<ChapterDetailScreen />} />
        <Route path="/study/:mode/:chapter" element={<StudyScreen />} />
        <Route path="/result" element={<ResultScreen />} />
      </Routes>
      {!immersive && <TabBar />}
    </div>
  );
}
```

- [ ] **Step 4: `src/main.tsx`（HashRouter・Provider・テーマ適用）**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AppDataProvider } from './state/AppDataContext';
import './theme/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppDataProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AppDataProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 5: 各screenの仮実装を作成（コンパイルを通すため）**

`src/screens/` に6ファイルを作り、各々最小の default 相当を置く。例 `HomeScreen.tsx`:

```tsx
export function HomeScreen() { return <div style={{ padding: 16 }}>ホーム</div>; }
```

同様に `StatsScreen`(成績), `SettingsScreen`(設定), `ChapterDetailScreen`, `StudyScreen`, `ResultScreen` を named export で作る（後続タスクで中身を実装）。

- [ ] **Step 6: 起動確認**

Run: `npm run dev`（ブラウザで `http://localhost:5173/world-history-quiz/` を開く。注: base 付き）
Expected: 下部に3タブが表示され、タブ切替で「ホーム/成績/設定」が出る。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: app shell, hash routing, tab bar, theme css"
```

---

## Task 12: Flashcard コンポーネント（4方向スワイプ＋絞り）

**Files:**
- Create: `src/components/Flashcard.tsx`, `src/components/Flashcard.test.tsx`

判定は右=known/上=unsure/左=failed、下ドラッグで解答を絞り表示。PCは矢印キー対応。ポインタ操作は結合が難しいので、テストは「キーボードで判定コールバックが呼ばれる」ことを検証する。

- [ ] **Step 1: 失敗するテストを書く `src/components/Flashcard.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Flashcard } from './Flashcard';

const q = { no: 1, chapter: 'A', question: 'Qテキスト', answer: 'Aテキスト' };

describe('Flashcard', () => {
  it('問題文を表示する', () => {
    render(<Flashcard question={q} onJudge={() => {}} />);
    expect(screen.getByText('Qテキスト')).toBeInTheDocument();
  });

  it('→キーで known 判定', () => {
    const onJudge = vi.fn();
    render(<Flashcard question={q} onJudge={onJudge} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onJudge).toHaveBeenCalledWith('known');
  });

  it('↑キーで unsure, ←キーで failed', () => {
    const onJudge = vi.fn();
    render(<Flashcard question={q} onJudge={onJudge} />);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onJudge).toHaveBeenNthCalledWith(1, 'unsure');
    expect(onJudge).toHaveBeenNthCalledWith(2, 'failed');
  });

  it('↓キーで解答が表示される', () => {
    render(<Flashcard question={q} onJudge={() => {}} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    // 絞り完了で解答が可視(opacity=1)
    const ans = screen.getByText('Aテキスト');
    expect(ans).toBeVisible();
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npx vitest run src/components/Flashcard.test.tsx`
Expected: FAIL

- [ ] **Step 3: 実装 `src/components/Flashcard.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Question, SwipeResult } from '../domain/types';

interface Props {
  question: Question;
  onJudge: (result: SwipeResult) => void;
}

export function Flashcard({ question, onJudge }: Props) {
  const [reveal, setReveal] = useState(0); // 0..1 絞り進捗
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const start = useRef<{ x: number; y: number } | null>(null);
  const THRESHOLD = 90;

  // カード切替でリセット
  useEffect(() => { setReveal(0); setDrag({ x: 0, y: 0 }); }, [question.no]);

  // キーボード操作（PC）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onJudge('known');
      else if (e.key === 'ArrowUp') onJudge('unsure');
      else if (e.key === 'ArrowLeft') onJudge('failed');
      else if (e.key === 'ArrowDown') setReveal(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onJudge]);

  function pointerDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function pointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    setDrag({ x: dx, y: dy });
    if (dy > 0) setReveal(Math.min(dy / 160, 1));
  }
  function pointerUp() {
    if (!start.current) return;
    const { x, y } = drag;
    if (Math.abs(x) > Math.abs(y) && Math.abs(x) > THRESHOLD) {
      onJudge(x > 0 ? 'known' : 'failed');
    } else if (y < -THRESHOLD) {
      onJudge('unsure');
    }
    start.current = null;
    setDrag({ x: 0, y: 0 });
  }

  return (
    <div
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      style={{
        transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`,
        touchAction: 'none', userSelect: 'none',
        background: 'var(--surface)', borderRadius: 22, padding: '26px 20px',
        boxShadow: '0 8px 24px rgba(0,0,0,.15)',
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: '.08em', color: 'var(--muted)' }}>問題</div>
      <div style={{ fontSize: 17, lineHeight: 1.6, marginTop: 8 }}>{question.question}</div>
      <div style={{ marginTop: 20, borderTop: '1px dashed var(--border)', paddingTop: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: '.08em', color: 'var(--muted)' }}>解答</div>
        <div style={{
          fontSize: 24, fontWeight: 700, marginTop: 6, color: 'var(--accent)',
          filter: `blur(${9 - 9 * reveal}px)`, opacity: 0.25 + 0.75 * reveal,
          transition: start.current ? 'none' : 'filter .2s, opacity .2s',
        }}>{question.answer}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `npx vitest run src/components/Flashcard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Flashcard.tsx src/components/Flashcard.test.tsx
git commit -m "feat: flashcard with 4-way swipe and squeeze reveal"
```

---

## Task 13: 積層棒グラフ（StackedBarChart）

**Files:**
- Create: `src/components/StackedBarChart.tsx`, `src/components/StackedBarChart.test.tsx`

各回の棒＝全問固定高。下から マスター/あやふや/できなかった/未回答。緑の上端に白文字で%。

- [ ] **Step 1: 失敗するテストを書く `src/components/StackedBarChart.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StackedBarChart } from './StackedBarChart';
import { RoundRecord } from '../domain/types';

const rounds: RoundRecord[] = [
  { round: 1, timestamp: 1, counts: { mastered: 2, unsure: 8, failed: 10, unanswered: 11 }, masteryPct: 6 },
  { round: 2, timestamp: 2, counts: { mastered: 31, unsure: 0, failed: 0, unanswered: 0 }, masteryPct: 100 },
];

describe('StackedBarChart', () => {
  it('各回の%ラベルを描画', () => {
    const { container } = render(<StackedBarChart rounds={rounds} total={31} />);
    const texts = [...container.querySelectorAll('text')].map((t) => t.textContent);
    expect(texts).toContain('6%');
    expect(texts).toContain('100%');
  });

  it('rounds分の緑矩形がある', () => {
    const { container } = render(<StackedBarChart rounds={rounds} total={31} />);
    const greens = container.querySelectorAll('rect[fill="#3f9e5a"]');
    expect(greens.length).toBe(2);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `npx vitest run src/components/StackedBarChart.test.tsx`
Expected: FAIL

- [ ] **Step 3: 実装 `src/components/StackedBarChart.tsx`**

```tsx
import { RoundRecord } from '../domain/types';
import { STATE_COLORS } from '../domain/colors';

interface Props { rounds: RoundRecord[]; total: number; }

const TOP = 14, BOTTOM = 130, LEFT = 34, RIGHT = 290, BARW = 26;

export function StackedBarChart({ rounds, total }: Props) {
  const h = (n: number) => (total === 0 ? 0 : (n / total) * (BOTTOM - TOP));
  const slots = Math.max(rounds.length, 1);
  const step = (RIGHT - LEFT - 20) / slots;

  return (
    <svg viewBox="0 0 300 172" style={{ width: '100%', height: 'auto' }}>
      <line x1={LEFT} y1={TOP} x2={LEFT} y2={BOTTOM} stroke="var(--border)" />
      <line x1={LEFT} y1={BOTTOM} x2={RIGHT} y2={BOTTOM} stroke="var(--border)" />
      {rounds.map((r, i) => {
        const x = LEFT + 12 + i * step;
        const g = h(r.counts.mastered);
        const y = h(r.counts.unsure);
        const rr = h(r.counts.failed);
        const gTop = BOTTOM - g;
        const yTop = gTop - y;
        const rTop = yTop - rr;
        return (
          <g key={r.round}>
            <rect x={x} y={gTop} width={BARW} height={g} fill={STATE_COLORS.mastered} />
            <rect x={x} y={yTop} width={BARW} height={y} fill={STATE_COLORS.unsure} />
            <rect x={x} y={rTop} width={BARW} height={rr} fill={STATE_COLORS.failed} />
            <rect x={x} y={TOP} width={BARW} height={rTop - TOP} fill={STATE_COLORS.unanswered} />
            <text x={x + BARW / 2} y={Math.min(gTop + 11, BOTTOM - 3)}
              fontSize={9} fontWeight={800} fill="#fff" textAnchor="middle">
              {r.masteryPct}%
            </text>
            <text x={x + BARW / 2} y={144} fontSize={8} fill="var(--muted)" textAnchor="middle">
              {r.round}回
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `npx vitest run src/components/StackedBarChart.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/StackedBarChart.tsx src/components/StackedBarChart.test.tsx
git commit -m "feat: stacked bar growth chart"
```

---

## Task 14: 補助表示（MasteryRing / Confetti）

**Files:**
- Create: `src/components/MasteryRing.tsx`, `src/components/Confetti.tsx`

- [ ] **Step 1: `src/components/MasteryRing.tsx`**

```tsx
interface Props { pct: number; size?: number; color?: string; }

export function MasteryRing({ pct, size = 56, color = 'var(--accent)' }: Props) {
  const C = 2 * Math.PI * 15.5;
  const offset = C * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox="0 0 36 36" width={size} height={size}>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 18 18)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 800 }}>
        <span style={{ fontSize: size * 0.27 }}>{pct}</span>
        <span style={{ fontSize: size * 0.16, opacity: 0.7, marginLeft: 1 }}>%</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `src/components/Confetti.tsx`（8つ・設計の指定）**

```tsx
const PIECES = [
  { top: 22, left: 28, c: '#3f9e5a', r: 20 }, { top: 38, left: 250, c: '#e6b800', r: -15 },
  { top: 66, left: 56, c: '#e5736b', r: 0 },  { top: 54, left: 220, c: '#3b6cff', r: 30 },
  { top: 30, left: 120, c: '#7a3bff', r: 45 }, { top: 80, left: 265, c: '#f0993c', r: -25 },
  { top: 92, left: 38, c: '#e5679a', r: 15 },  { top: 44, left: 88, c: '#20b0b0', r: -40 },
];

export function Confetti() {
  return (
    <>
      {PIECES.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: p.top, left: p.left, width: 6, height: 6,
          background: p.c, borderRadius: 2, transform: `rotate(${p.r}deg)`, pointerEvents: 'none',
        }} />
      ))}
    </>
  );
}
```

- [ ] **Step 3: コンパイル確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/components/MasteryRing.tsx src/components/Confetti.tsx
git commit -m "feat: mastery ring and confetti (8 pieces)"
```

---

## Task 15: 出題セッション画面（StudyScreen）＋ round記録

**Files:**
- Modify: `src/screens/StudyScreen.tsx`, `src/state/AppDataContext.tsx`
- Create: `src/screens/StudyScreen.test.tsx`

StudyScreen は URL `/study/:mode/:chapter`（mode: `chapter` | `unsure` | `failed`）でセッションを組み、Flashcardを回し、終了で `chapterRounds` に1回分を追記して `/result` へ遷移。

- [ ] **Step 1: Contextに `recordRound` を追加 `src/state/AppDataContext.tsx`**

`Action` に追加:

```tsx
  | { type: 'round'; chapter: string; record: import('../domain/types').RoundRecord }
```

reducer に追加:

```tsx
    case 'round': {
      const list = state.chapterRounds[action.chapter] ?? [];
      return {
        ...state,
        chapterRounds: { ...state.chapterRounds, [action.chapter]: [...list, action.record] },
      };
    }
```

Ctx とプロバイダに追加:

```tsx
  recordRound: (chapter: string, record: RoundRecord) => void;
  // ...
  recordRound: (chapter, record) => dispatch({ type: 'round', chapter, record }),
```

（`RoundRecord` を import に追加）

- [ ] **Step 2: 失敗するテストを書く `src/screens/StudyScreen.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppDataProvider } from '../state/AppDataContext';
import { StudyScreen } from './StudyScreen';

beforeEach(() => localStorage.clear());

function renderAt(path: string) {
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/study/:mode/:chapter" element={<StudyScreen />} />
          <Route path="/result" element={<div>リザルト</div>} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  );
}

describe('StudyScreen', () => {
  it('進捗と問題を表示し、全問回答でリザルトへ', () => {
    renderAt('/study/chapter/古代オリエント');
    // 進捗表示（1 / N）が出る
    expect(screen.getByText(/\/\s*\d+/)).toBeInTheDocument();
    // 何度も→キーで最後まで回答すると /result へ
    for (let i = 0; i < 60; i++) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      if (screen.queryByText('リザルト')) break;
    }
    expect(screen.getByText('リザルト')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 実行して失敗を確認**

Run: `npx vitest run src/screens/StudyScreen.test.tsx`
Expected: FAIL（StudyScreenが仮実装）

- [ ] **Step 4: 実装 `src/screens/StudyScreen.tsx`**

```tsx
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { useAppData } from '../state/AppDataContext';
import { Flashcard } from '../components/Flashcard';
import { buildChapterSession, buildUnsureSession } from '../domain/session';
import { countStates, masteryPct } from '../domain/aggregate';
import { SwipeResult, Counts } from '../domain/types';

export function StudyScreen() {
  const { mode = 'chapter', chapter = '' } = useParams();
  const questions = useQuestions();
  const { data, recordAnswer, recordRound } = useAppData();
  const navigate = useNavigate();

  // セッションは初回のみ確定（回答で並びが変わらないよう固定）
  const session = useMemo(() => {
    const opts = { order: data.settings.order, sessionSize: data.settings.sessionSize };
    if (mode === 'unsure') return buildUnsureSession(questions, data.progress, chapter, opts);
    return buildChapterSession(questions, data.progress, chapter, { ...opts, maintenanceRatio: 0.2 });
    // 注: mode='failed'（できなかった復習）は Result から state で渡す簡易版を Task 17 で対応
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [idx, setIdx] = useState(0);
  const tally = useRef({ known: 0, unsure: 0, failed: 0 });

  if (session.length === 0) {
    return <div style={{ padding: 24 }}>この条件の問題はありません。<button onClick={() => navigate(-1)}>戻る</button></div>;
  }

  const q = session[idx];

  function judge(result: SwipeResult) {
    recordAnswer(q.no, result);
    tally.current[result]++;
    const next = idx + 1;
    if (next >= session.length) finish();
    else setIdx(next);
  }

  function finish() {
    // 章の現在内訳で round を記録（回答反映は非同期なので、この場のtallyではなく再集計でも可）
    const counts: Counts = countStates(questions, data.progress, chapter);
    const round = (data.chapterRounds[chapter]?.length ?? 0) + 1;
    recordRound(chapter, { round, timestamp: Date.now(), counts, masteryPct: masteryPct(counts) });
    navigate('/result', {
      state: { chapter, total: session.length, tally: tally.current,
        failedNos: session.filter((_, i) => i <= idx).map((s) => s.no)
          .filter((no) => data.progress[no]?.state === 'failed') },
    });
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
        <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', color: 'var(--muted)' }}>‹ {chapter}</button>
        <span>{idx + 1} / {session.length}</span>
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, margin: '8px 0 20px' }}>
        <div style={{ width: `${((idx + 1) / session.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
      </div>
      <Flashcard question={q} onJudge={judge} />
      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--muted)' }}>
        ← できなかった ・ ↑ あやふや ・ → 覚えた ・ ↓ 解答
      </div>
    </div>
  );
}
```

> 注: `round` の内訳は「回答後の最新状態」で記録したいが、reducerの反映は次レンダー。厳密性を高めるなら round 記録を `useEffect` で `data.progress` 更新後に行う実装に差し替える（実行者判断。MVPは上記で可）。

- [ ] **Step 5: 実行して成功を確認**

Run: `npx vitest run src/screens/StudyScreen.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/screens/StudyScreen.tsx src/state/AppDataContext.tsx src/screens/StudyScreen.test.tsx
git commit -m "feat: study session screen + round recording"
```

---

## Task 16: リザルト画面（ResultScreen）

**Files:**
- Modify: `src/screens/ResultScreen.tsx`

- [ ] **Step 1: 実装 `src/screens/ResultScreen.tsx`**

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { useQuestions } from '../hooks/useQuestions';
import { countStates, masteryPct } from '../domain/aggregate';
import { Confetti } from '../components/Confetti';

interface ResultState {
  chapter: string; total: number;
  tally: { known: number; unsure: number; failed: number };
  failedNos: number[];
}

export function ResultScreen() {
  const nav = useNavigate();
  const { data } = useAppData();
  const questions = useQuestions();
  const st = (useLocation().state ?? null) as ResultState | null;

  if (!st) { nav('/'); return null; }

  const pct = masteryPct(countStates(questions, data.progress, st.chapter));

  return (
    <div style={{ minHeight: '100vh', position: 'relative', padding: '34px 22px 100px', textAlign: 'center' }}>
      <Confetti />
      <div style={{ fontSize: 42 }}>🎉</div>
      <div style={{ fontSize: 21, fontWeight: 800 }}>おつかれさま！</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{st.chapter} ・ {st.total}問</div>

      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 18, padding: 16, marginTop: 18, boxShadow: 'var(--shadow)' }}>
        <Stat n={st.tally.known} label="覚えた" color="#3f9e5a" />
        <Stat n={st.tally.unsure} label="あやふや" color="#c98a00" border />
        <Stat n={st.tally.failed} label="できなかった" color="#d23b3b" />
      </div>

      <div style={{ background: '#f0f7f2', border: '1px solid #d6ecdd', borderRadius: 16, padding: 14, marginTop: 12, textAlign: 'left' }}>
        <div style={{ fontSize: 11, color: '#5a8a68' }}>この章の習熟度</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#3f9e5a', marginTop: 4 }}>{pct}<span style={{ fontSize: 10 }}>%</span> ・ グラフに記録しました 📈</div>
      </div>

      <div style={{ position: 'fixed', bottom: 18, left: 22, right: 22, maxWidth: 436, margin: '0 auto' }}>
        <button className="btn-primary" style={{ marginBottom: 9 }}
          onClick={() => nav(`/study/chapter/${encodeURIComponent(st.chapter)}`, { replace: true })}>
          🔁 もう一度挑戦
        </button>
        {st.failedNos.length > 0 && (
          <button onClick={() => nav(`/study/failed/${encodeURIComponent(st.chapter)}`, { replace: true, state: { failedNos: st.failedNos } })}
            style={{ width: '100%', background: 'var(--surface)', border: '1px solid #f2e2b0', color: '#c98a00', borderRadius: 14, padding: 11, fontWeight: 800, marginBottom: 9 }}>
            ⚡ できなかった{st.failedNos.length}問だけ復習
          </button>
        )}
        <button onClick={() => nav('/')} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--muted)', padding: 8, fontWeight: 700 }}>
          ホームにもどる
        </button>
      </div>
    </div>
  );
}

function Stat({ n, label, color, border }: { n: number; label: string; color: string; border?: boolean }) {
  return (
    <div style={{ flex: 1, borderLeft: border ? '1px solid var(--border)' : undefined, borderRight: border ? '1px solid var(--border)' : undefined }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{n}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: 「できなかった復習」モードを StudyScreen で処理**

`StudyScreen` の `session` 生成に mode='failed' を追加（location.state の failedNos を使用）:

```tsx
import { useLocation } from 'react-router-dom';
import { pickByNumbers } from '../domain/session';
// ...
const loc = useLocation();
const session = useMemo(() => {
  const opts = { order: data.settings.order, sessionSize: data.settings.sessionSize };
  if (mode === 'failed') {
    const nos = (loc.state as { failedNos?: number[] } | null)?.failedNos ?? [];
    return pickByNumbers(questions, nos);
  }
  if (mode === 'unsure') return buildUnsureSession(questions, data.progress, chapter, opts);
  return buildChapterSession(questions, data.progress, chapter, { ...opts, maintenanceRatio: 0.2 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 3: 動作確認（手動）**

Run: `npm run dev`
Expected: ホーム未実装でも、URL `#/study/chapter/古代オリエント` に直接遷移→数問回答→リザルト→「もう一度挑戦」が動く。

- [ ] **Step 4: Commit**

```bash
git add src/screens/ResultScreen.tsx src/screens/StudyScreen.tsx
git commit -m "feat: result screen with retry / failed-review / streak display"
```

---

## Task 17: ホーム画面（習熟マップ）

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: 実装 `src/screens/HomeScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { useAppData } from '../state/AppDataContext';
import { chapterList, countStates, masteryPct, overallMastery } from '../domain/aggregate';
import { masteryColor } from '../domain/colors';
import { MasteryRing } from '../components/MasteryRing';

export function HomeScreen() {
  const nav = useNavigate();
  const questions = useQuestions();
  const { data } = useAppData();
  const chapters = chapterList(questions);
  const overall = overallMastery(questions, data.progress);
  const completed = chapters.filter((c) => masteryPct(countStates(questions, data.progress, c)) >= 100).length;

  // あやふや総数
  const unsureCount = Object.values(data.progress).filter((p) => p.state === 'unsure').length;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>習熟マップ</h1>
        <span style={{ fontSize: 13, color: '#e8622b' }}>🔥 {data.streak.current}</span>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--surface)', borderRadius: 16, padding: 14, boxShadow: 'var(--shadow)' }}>
        <MasteryRing pct={overall.pct} />
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>全体の習熟度</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{overall.mastered} / {overall.total} 問マスター</div>
          <div style={{ fontSize: 11, color: '#b8860b' }}>🏆 コンプ章 {completed} / {chapters.length}</div>
        </div>
      </div>

      {unsureCount > 0 && (
        <div onClick={() => nav('/study/unsure/all')} style={{ marginTop: 12, padding: '12px 15px', borderRadius: 15, background: '#fff8e6', border: '1px solid #f2e2b0', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
          <span style={{ fontWeight: 800, color: '#c98a00' }}>⚡ あやふや復習</span>
          <span style={{ color: '#a98a3a' }}>{unsureCount}問</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginTop: 14 }}>
        {chapters.map((c, i) => {
          const pct = masteryPct(countStates(questions, data.progress, c));
          const bg = masteryColor(pct);
          return (
            <div key={c} onClick={() => nav(`/chapter/${encodeURIComponent(c)}`)}
              style={{ background: bg, borderRadius: 11, padding: '8px 4px', textAlign: 'center', color: pct >= 26 && pct < 51 ? '#fff' : pct >= 100 ? '#5a3d00' : '#fff', cursor: 'pointer', minHeight: 52 }}>
              <div style={{ fontSize: 8, opacity: 0.85 }}>{i + 1}</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {pct >= 100 ? '🏆' : <>{pct}<span style={{ fontSize: 9, opacity: 0.75 }}>%</span></>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

> `あやふや復習` の章横断版は `/study/unsure/all` を許容するため、`buildUnsureSession` を全章対象でも動くよう chapter='all' の時は章フィルタを外す分岐を `session.ts` に足す（下記）。

- [ ] **Step 2: `session.ts` に 'all' 分岐を追加**

`buildUnsureSession` 内の filter を:

```ts
const unsure = questions.filter((q) =>
  (chapter === 'all' || q.chapter === chapter) && stateOf(prog, q.no) === 'unsure');
```

同テスト `session.test.ts` に1ケース追加:

```ts
it("chapter='all' で全章の unsure", () => {
  const p = prog({ 1: 'unsure' });
  const s = buildUnsureSession(qs, p, 'all', { order: 'sequential', sessionSize: 0 });
  expect(s.map((q) => q.no)).toContain(1);
});
```

Run: `npx vitest run src/domain/session.test.ts` → PASS

- [ ] **Step 3: 手動確認**

Run: `npm run dev`
Expected: ホームに全体リング・27章グリッド（色分け・%）が表示。タイルタップで章詳細へ。

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen.tsx src/domain/session.ts src/domain/session.test.ts
git commit -m "feat: home screen mastery map + all-chapter unsure review"
```

---

## Task 18: 章詳細画面（ChapterDetailScreen）

**Files:**
- Modify: `src/screens/ChapterDetailScreen.tsx`

- [ ] **Step 1: 実装 `src/screens/ChapterDetailScreen.tsx`**

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { useAppData } from '../state/AppDataContext';
import { countStates, masteryPct } from '../domain/aggregate';
import { StackedBarChart } from '../components/StackedBarChart';

export function ChapterDetailScreen() {
  const { chapter = '' } = useParams();
  const nav = useNavigate();
  const questions = useQuestions();
  const { data } = useAppData();

  const total = questions.filter((q) => q.chapter === chapter).length;
  const counts = countStates(questions, data.progress, chapter);
  const pct = masteryPct(counts);
  const rounds = data.chapterRounds[chapter] ?? [];
  const complete = pct >= 100;

  return (
    <div style={{ padding: 16, paddingBottom: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav(-1)} style={{ border: 'none', background: 'none', fontSize: 18, color: 'var(--muted)' }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{chapter}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{total}問</div>
        </div>
        <div style={{ fontWeight: 800, color: complete ? '#b8860b' : '#3f9e5a' }}>
          {complete ? '🏆 ' : ''}{pct}<span style={{ fontSize: 9, opacity: 0.7 }}>%</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--muted)', marginTop: 10 }}>
        <span>🟢 マスター {counts.mastered}</span>
        <span>🟡 あやふや {counts.unsure}</span>
        <span>🔴 できなかった {counts.failed}</span>
        <span>⚪ 未回答 {counts.unanswered}</span>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '14px 12px', marginTop: 14, boxShadow: 'var(--shadow)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>この章の伸び 📈</div>
        {rounds.length === 0
          ? <div style={{ fontSize: 12, color: 'var(--muted)', padding: '20px 0', textAlign: 'center' }}>学習するとここに伸びが記録されます</div>
          : <StackedBarChart rounds={rounds} total={total} />}
      </div>

      <div style={{ position: 'fixed', bottom: 18, left: 16, right: 16, maxWidth: 448, margin: '0 auto' }}>
        {counts.unsure > 0 && (
          <button onClick={() => nav(`/study/unsure/${encodeURIComponent(chapter)}`)}
            style={{ width: '100%', background: 'var(--surface)', border: '1px solid #f2e2b0', color: '#c98a00', borderRadius: 14, padding: 11, fontWeight: 800, marginBottom: 10 }}>
            ⚡ あやふや {counts.unsure}問だけ
          </button>
        )}
        <button className="btn-primary" onClick={() => nav(`/study/chapter/${encodeURIComponent(chapter)}`)}>
          {complete ? '🔁 もう一度ぜんぶ復習する' : '▶ この章を学習'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 手動確認**

Run: `npm run dev`
Expected: 章タイル→詳細。学習前はグラフ空表示、1セッション後に棒が増える。

- [ ] **Step 3: Commit**

```bash
git add src/screens/ChapterDetailScreen.tsx
git commit -m "feat: chapter detail with growth chart and study actions"
```

---

## Task 19: 成績画面（StatsScreen）

**Files:**
- Modify: `src/screens/StatsScreen.tsx`

- [ ] **Step 1: 実装 `src/screens/StatsScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { useAppData } from '../state/AppDataContext';
import { chapterList, countStates, masteryPct, overallMastery } from '../domain/aggregate';
import { MasteryRing } from '../components/MasteryRing';
import { masteryColor } from '../domain/colors';

export function StatsScreen() {
  const nav = useNavigate();
  const questions = useQuestions();
  const { data } = useAppData();
  const chapters = chapterList(questions);
  const overall = overallMastery(questions, data.progress);

  const ranked = chapters
    .map((c) => ({ c, pct: masteryPct(countStates(questions, data.progress, c)) }))
    .filter((x) => x.pct < 100)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18 }}>成績</h1>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--surface)', borderRadius: 18, padding: 16, boxShadow: 'var(--shadow)' }}>
        <MasteryRing pct={overall.pct} size={70} />
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>全体の習熟度</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{overall.mastered} / {overall.total} 問マスター</div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 14, marginTop: 12, boxShadow: 'var(--shadow)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ fontWeight: 700 }}>🔥 ストリーク</span>
          <span style={{ color: 'var(--muted)' }}>現在 {data.streak.current} / 最長 {data.streak.longest}</span>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', margin: '0 2px 6px' }}>苦手な章（優先的に）</div>
        <div style={{ background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          {ranked.map((r) => (
            <div key={r.c} onClick={() => nav(`/chapter/${encodeURIComponent(r.c)}`)}
              style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: masteryColor(r.pct) }} />
              <span style={{ flex: 1, fontSize: 13 }}>{r.c}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: masteryColor(r.pct) }}>{r.pct}<span style={{ fontSize: 8 }}>%</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

> 「全体習熟度の推移（週別折れ線）」は日次のスナップショット履歴が必要。MVPでは上記（リング＋ストリーク＋苦手章）までとし、週次推移は後追い（要: 日次記録の追加）。設計書の「後追い」に整理済み。

- [ ] **Step 2: 手動確認 → Commit**

```bash
git add src/screens/StatsScreen.tsx
git commit -m "feat: stats screen (overall, streak, weak chapters)"
```

---

## Task 20: 設定画面（SettingsScreen）＋テーマ/アクセント適用＋バックアップ

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`, `src/state/AppDataContext.tsx`

- [ ] **Step 1: テーマ/アクセントをDOMに反映（AppDataContext）**

`AppDataProvider` に副作用を追加（`data.settings` 変更時に `documentElement` へ反映）:

```tsx
useEffect(() => {
  const root = document.documentElement;
  const theme = data.settings.theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : data.settings.theme;
  root.setAttribute('data-theme', theme);
  root.style.setProperty('--accent', data.settings.accent);
}, [data.settings.theme, data.settings.accent]);
```

- [ ] **Step 2: 実装 `src/screens/SettingsScreen.tsx`**

```tsx
import { useRef } from 'react';
import { useAppData } from '../state/AppDataContext';
import { exportJson, importJson } from '../storage/storage';
import { Theme, Order, SessionSize } from '../domain/types';

const ACCENTS = ['#3b6cff', '#3f9e5a', '#7a3bff', '#f0993c', '#e5679a', '#20b0b0'];
const SIZES: { v: SessionSize; label: string }[] = [
  { v: 0, label: '制限なし' }, { v: 10, label: '10' }, { v: 20, label: '20' }, { v: 30, label: '30' },
];

export function SettingsScreen() {
  const { data, updateSettings, replaceData } = useAppData();
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);

  function doExport() {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `whq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => {
      try { replaceData(importJson(t)); alert('進捗を復元しました'); }
      catch { alert('ファイルが不正です'); }
    });
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18 }}>設定</h1>

      <Section title="表示">
        <Row label="テーマ">
          <Segmented<Theme> value={s.theme}
            options={[['light', 'ライト'], ['dark', 'ダーク'], ['system', '端末に合わせる']]}
            onChange={(theme) => updateSettings({ theme })} />
        </Row>
        <Row label="アクセントカラー">
          <div style={{ display: 'flex', gap: 10 }}>
            {ACCENTS.map((c) => (
              <div key={c} onClick={() => updateSettings({ accent: c })}
                style={{ width: 26, height: 26, borderRadius: '50%', background: c,
                  boxShadow: s.accent === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined, cursor: 'pointer' }} />
            ))}
          </div>
        </Row>
      </Section>

      <Section title="学習">
        <Row label="出題順">
          <Segmented<Order> value={s.order}
            options={[['sequential', '順番'], ['random', 'ランダム']]}
            onChange={(order) => updateSettings({ order })} />
        </Row>
        <Row label="1セッションの問題数">
          <Segmented<SessionSize> value={s.sessionSize}
            options={SIZES.map((x) => [x.v, x.label] as [SessionSize, string])}
            onChange={(sessionSize) => updateSettings({ sessionSize })} />
        </Row>
        <Row label="マスター判定">
          <Segmented<1 | 2> value={s.masterThreshold}
            options={[[2, '覚えた2回'], [1, '1回']]}
            onChange={(masterThreshold) => updateSettings({ masterThreshold })} />
        </Row>
      </Section>

      <Section title="データ">
        <div onClick={doExport} style={rowBtn}>★ 進捗をエクスポート（バックアップ）</div>
        <div onClick={() => fileRef.current?.click()} style={rowBtn}>★ 進捗をインポート（復元）</div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={doImport} />
      </Section>

      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', margin: '16px 0' }}>世界史 一問一答 ・ v1.0.0</div>
    </div>
  );
}

const rowBtn: React.CSSProperties = { padding: '12px 14px', fontSize: 13, borderBottom: '1px solid var(--border)', cursor: 'pointer' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--muted)', margin: '16px 2px 6px' }}>{title}</div>
      <div style={{ background: 'var(--surface)', borderRadius: 14, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>{children}</div>
    </>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>{label}</div>{children}
    </div>
  );
}
function Segmented<T extends string | number>({ value, options, onChange }:
  { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', fontSize: 11, flexWrap: 'wrap' }}>
      {options.map(([v, label]) => (
        <span key={String(v)} onClick={() => onChange(v)}
          style={{ padding: '6px 12px', cursor: 'pointer',
            background: value === v ? 'var(--accent)' : 'transparent',
            color: value === v ? '#fff' : 'var(--muted)', fontWeight: value === v ? 700 : 400 }}>
          {label}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 手動確認**

Run: `npm run dev`
Expected: テーマ切替で全画面がダーク/ライトに、アクセント色でボタン等が変わる。エクスポートでJSONダウンロード、インポートで復元。

- [ ] **Step 4: Commit**

```bash
git add src/screens/SettingsScreen.tsx src/state/AppDataContext.tsx
git commit -m "feat: settings (theme/accent/order/session size/master rule) + backup import-export"
```

---

## Task 21: PWA（オフライン・ホーム追加）

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`

- [ ] **Step 1: プラグイン導入**

```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: `vite.config.ts` にPWA設定**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/world-history-quiz/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '世界史 一問一答',
        short_name: '世界史一問一答',
        start_url: '.',
        display: 'standalone',
        background_color: '#f4f6fa',
        theme_color: '#3b6cff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

- [ ] **Step 3: アイコンを用意**

`public/icons/` に 192x192, 512x512 のPNGを置く（暫定で単色＋「世」等でよい。ツールやプレースホルダ画像で作成）。

- [ ] **Step 4: ビルドしてPWAを確認**

Run: `npm run build && npm run preview`
Expected: ビルド成功。`dist` に `sw.js` と `manifest.webmanifest` が生成。preview をブラウザで開き、DevTools > Application で Service Worker 登録・manifest 認識を確認。オフライン（Network: Offline）でもリロードして動く。

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts public/icons/ index.html
git commit -m "feat: PWA (offline caching + installable manifest)"
```

---

## Task 22: 仕上げ（全テスト・ビルド・READMEと公開手順メモ）

**Files:**
- Create: `README.md`

- [ ] **Step 1: 全テスト**

Run: `npm test`
Expected: 全 PASS

- [ ] **Step 2: 型チェック＆本番ビルド**

Run: `npm run build`
Expected: 成功（型エラーなし・`dist/` 生成）

- [ ] **Step 3: `README.md` を作成（開発・公開手順）**

```markdown
# 世界史 一問一答

スマホ向け世界史一問一答アプリ。4方向スワイプ・習熟度可視化・ローカル保存・オフライン対応。

## 開発
- `npm run dev` 開発サーバ（`/world-history-quiz/` パスで開く）
- `npm test` テスト
- `npm run questions` 問題CSV→JSON変換（`data/questions.csv` を配置後）
- `npm run build` 本番ビルド

## GitHub Pages 公開（後日）
1. GitHubにリポジトリ `world-history-quiz` を作成し push
2. `npm run build` → `dist/` を `gh-pages` ブランチへ（例: `npx gh-pages -d dist`）
   または Actions で自動デプロイ
3. Settings > Pages でブランチ/ディレクトリを指定
4. `vite.config.ts` の `base` はリポジトリ名と一致させる

## データ更新
スプレッドシートをCSVエクスポート → `data/questions.csv` に上書き → `npm run questions`
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README with dev and GitHub Pages deploy notes"
```

---

## 実装後の確認（受け入れ基準）

- [ ] ホームで27章が習熟度色＋%で表示され、タイルから章詳細へ行ける
- [ ] 出題で4方向スワイプ（PCは矢印キー）が効き、下方向で解答が絞り表示される
- [ ] 覚えた2回連続でマスター、%と積層棒グラフが伸びる
- [ ] セッション終了でリザプト表示、🔁もう一度挑戦／できなかった復習が動く
- [ ] ストリークが日をまたいで増減する
- [ ] 設定でテーマ/アクセント/出題順/セッション数が反映され、進捗のエクスポート/インポートができる
- [ ] `npm run build` 後、オフラインでも動作しホーム画面に追加できる

---

## Self-Review メモ（作成者チェック済み）

- 設計書の各節（回答体験/4状態/出題ロジック/3タブ/各画面/積層棒/カラー/PWA/公開）にタスクを対応付け済み。
- 週次推移グラフ・リマインダー通知・効果音/振動・ダーク時のリザルト個別調整は設計書の「後追い」に整理し、MVPスコープ外として明記。
- 型・関数シグネチャ（`applySwipe`, `countStates`, `masteryPct`, `buildChapterSession`, `buildUnsureSession`, `recordStudyDay`, `masteryColor`, `STATE_COLORS`）はタスク間で一貫。
- 既知の妥協点: StudyScreen の round 内訳記録は reducer 反映タイミングの都合で簡易実装（Task15 注記）。厳密化は実行者判断で `useEffect` 化。
```
