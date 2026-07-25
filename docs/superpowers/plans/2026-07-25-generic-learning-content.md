# Learnscape 汎用学習コンテンツ化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 世界史専用の学習アプリを、任意の学習コンテンツをJSONで読み込んで学習できる汎用アプリに拡張する（初期搭載＝日本史・世界史の2本）。

**Architecture:** 「コンテンツ」概念を導入し、進捗をコンテンツ別に分離する。問題キーを `no:number` から `id:string` へ移行し、`区分(section) ＞ 章(chapter)` の2階層を持たせる。初期搭載2本はビルド時同梱、追加分は設定画面からJSONファイルでインポートしlocalStorageへ保存。UI構造・スワイプ判定・段階的鮮明化は現状維持し、鮮明化のみ「正解→解説・ポイント」の2段階に拡張する。

**Tech Stack:** React 19 / TypeScript / Vite 8 / vite-plugin-pwa / react-router-dom 7 / Vitest 4。データ変換はPython(pandas)のローカル開発スクリプト（本番ビルドは生成済みJSONのみ使用）。

**設計出典:** [設計ドキュメント](../specs/2026-07-25-generic-learning-content-design.md)

---

## ファイル構成（作成/変更するファイルと責務）

**新規作成:**
- `src/data/contents/japanese-history.json` — 初期搭載: 日本史（生成物）
- `src/data/contents/world-history.json` — 初期搭載: 世界史（生成物）
- `src/data/contents/index.ts` — 初期搭載コンテンツの束ね（`BUILTIN_CONTENTS`）とアクティブ解決ヘルパ
- `src/domain/content.ts` — コンテンツJSONの検証（`parseContent`）
- `src/domain/content.test.ts` — 検証のテスト
- `src/components/ContentPicker.tsx` — コンテンツ選択モーダル
- `scripts/build_contents.py` — Excel→コンテンツJSON変換（開発用ツール）

**変更:**
- `src/domain/types.ts` — 型を刷新（`Question`/`Content`/`AppData` 等）
- `src/domain/mastery.ts` / `session.ts` / `browse.ts` / `aggregate.ts` — `no→id`、区分>章の集計追加
- `src/storage/schema.ts` / `storage.ts` — スキーマv2
- `src/state/AppDataContext.tsx` — コンテンツ別進捗・アクティブ管理・インポート
- `src/hooks/useQuestions.ts` — アクティブコンテンツの問題を返す
- `src/components/Flashcard.tsx` — 2段階鮮明化＋選択肢/解説/ポイント表示
- `src/screens/HomeScreen.tsx` — 「〇〇 実績マップ」＋区分grouping＋タイトルタップでモーダル
- `src/screens/SettingsScreen.tsx` — コンテンツ読み込み(ファイル選択)セクション追加
- `src/screens/StudyScreen.tsx` / `ResultScreen.tsx` / `StatsScreen.tsx` / `ChapterDetailScreen.tsx` / `QuestionListScreen.tsx` — `no→id`・コンテキスト参照
- 既存テスト（`aggregate.test.ts` 他）— 新型に追随
- `vite.config.ts` / `index.html` / `package.json` — 名称・バージョン

**整理（要ユーザー確認、最終タスク）:**
- `data/questions.csv` / `src/data/questions.json` / `scripts/build-questions.mjs` — 旧世界史CSV系の廃止

---

## 確定した型定義（全タスク共通の参照）

以降のタスクはこの型に厳密に従うこと。

```ts
// src/domain/types.ts の最終形（Task 1 で作成）
export interface Question {
  id: string;            // 例 "JH0001"
  section: string;       // 区分（時代区分）
  chapter: string;       // 章（章名）
  chapterNo: number;     // 章の並び順
  difficulty?: string;   // 難度
  format?: string;       // 形式
  question: string;      // 問題文
  choices?: string | null;      // 選択肢（選択式のみ）
  answer: string;        // 正解
  explanation?: string | null;  // 解説
  point?: string | null;        // 学習ポイント
}

export type MasteryState = 'unanswered' | 'failed' | 'unsure' | 'mastered';
export type SwipeResult = 'known' | 'unsure' | 'failed';

export interface QuestionProgress {
  id: string;            // 旧 no:number
  state: MasteryState;
  knownStreak: number;
  lastStudiedAt: number | null;
}

export interface Counts { mastered: number; unsure: number; failed: number; unanswered: number; }
export interface RoundRecord { round: number; timestamp: number; counts: Counts; masteryPct: number; }
export interface Streak { current: number; longest: number; lastStudyDate: string | null; studyDates: string[]; }

export type Theme = 'light' | 'dark' | 'system';
export type Order = 'sequential' | 'random';
export type SessionSize = 0 | 10 | 20 | 30;
export type MasterThreshold = 1 | 2;

export interface Settings {
  theme: Theme; accent: string; order: Order; sessionSize: SessionSize;
  masterThreshold: MasterThreshold; soundEnabled: boolean; hapticEnabled: boolean;
}

export interface Content {
  schemaVersion: number;
  id: string;
  title: string;
  builtin: boolean;      // 初期搭載=true（削除不可）
  questions: Question[];
}

export interface ContentProgress {
  progress: Record<string, QuestionProgress>;    // key: question.id
  chapterRounds: Record<string, RoundRecord[]>;   // key: chapter名
}

export interface AppData {
  version: number;                                // = 2
  activeContentId: string;
  importedContents: Content[];                    // インポート分のみ（初期搭載は同梱JSON）
  byContent: Record<string, ContentProgress>;     // key: content.id
  streak: Streak;                                 // 全コンテンツ横断
  settings: Settings;
}
```

---

## Phase A: データ基盤

### Task 1: 型定義の刷新

**Files:**
- Modify: `src/domain/types.ts`

- [ ] **Step 1: `src/domain/types.ts` を上記「確定した型定義」で全置換**

「確定した型定義」セクションの内容をそのまま `src/domain/types.ts` に書き込む（`export` 群すべて）。

- [ ] **Step 2: 型チェックで既存の不整合を可視化**

Run: `cd C:/Users/500886/temp/Learnscape && npx tsc -b --noEmit`
Expected: `no` を参照している既存ファイル（mastery/session/browse/aggregate/screens/AppDataContext/storage）で多数のエラー。これらは後続タスクで解消する。**このタスクではコミットしない**（型のみ先行、ビルドは Phase 完了時に緑化）。

> 注: TDDの「テスト先行」はこの純粋な型定義タスクには適用しない。型はビルド（tsc）で検証する。

---

### Task 2: コンテンツJSON検証モジュール

**Files:**
- Create: `src/domain/content.ts`
- Test: `src/domain/content.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`src/domain/content.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseContent, CONTENT_SCHEMA_VERSION } from './content';

const validRaw = {
  schemaVersion: 1,
  id: 'sample',
  title: 'サンプル',
  questions: [
    { id: 'S0001', section: '区分A', chapter: '章1', chapterNo: 1, question: 'Q', answer: 'A' },
    { id: 'S0002', section: '区分A', chapter: '章1', chapterNo: 1, question: 'Q2', answer: 'A2',
      choices: 'ア／イ', difficulty: '基礎', format: '正誤', explanation: '解説', point: 'ポイント' },
  ],
};

describe('parseContent', () => {
  it('正当なJSONを Content(builtin=false) に変換する', () => {
    const r = parseContent(validRaw);
    expect(r.ok).toBe(true);
    expect(r.content?.id).toBe('sample');
    expect(r.content?.builtin).toBe(false);
    expect(r.content?.questions).toHaveLength(2);
    // 任意フィールド未指定は null に正規化
    expect(r.content?.questions[0].choices).toBeNull();
    expect(r.content?.questions[0].explanation).toBeNull();
  });

  it('schemaVersion が未知ならエラー', () => {
    const r = parseContent({ ...validRaw, schemaVersion: 999 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/schemaVersion/);
  });

  it('title が空ならエラー', () => {
    const r = parseContent({ ...validRaw, title: '' });
    expect(r.ok).toBe(false);
  });

  it('questions が空配列ならエラー', () => {
    const r = parseContent({ ...validRaw, questions: [] });
    expect(r.ok).toBe(false);
  });

  it('必須フィールド欠落（answer なし）はエラー', () => {
    const bad = { ...validRaw, questions: [{ id: 'X', section: 's', chapter: 'c', chapterNo: 1, question: 'q' }] };
    const r = parseContent(bad);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/answer/);
  });

  it('問題IDの重複はエラー', () => {
    const dup = { ...validRaw, questions: [validRaw.questions[0], validRaw.questions[0]] };
    const r = parseContent(dup);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/重複|duplicate/i);
  });

  it('CONTENT_SCHEMA_VERSION は 1', () => {
    expect(CONTENT_SCHEMA_VERSION).toBe(1);
  });
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/domain/content.test.ts`
Expected: FAIL（`content.ts` が存在しない）

- [ ] **Step 3: 実装**

`src/domain/content.ts`:
```ts
import type { Content, Question } from './types';

export const CONTENT_SCHEMA_VERSION = 1;

export interface ParseResult {
  ok: boolean;
  content?: Content;   // builtin=false で返す
  error?: string;
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}
function optStr(v: unknown): string | null {
  if (v == null) return null;
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

export function parseContent(raw: unknown, builtin = false): ParseResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'JSONがオブジェクトではありません' };
  const o = raw as Record<string, unknown>;

  if (o.schemaVersion !== CONTENT_SCHEMA_VERSION) {
    return { ok: false, error: `未対応の schemaVersion です（対応: ${CONTENT_SCHEMA_VERSION}）` };
  }
  const id = str(o.id);
  const title = str(o.title);
  if (!id) return { ok: false, error: 'id が空です' };
  if (!title) return { ok: false, error: 'title が空です' };
  if (!Array.isArray(o.questions) || o.questions.length === 0) {
    return { ok: false, error: 'questions が空です' };
  }

  const questions: Question[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < o.questions.length; i++) {
    const q = o.questions[i] as Record<string, unknown>;
    const qid = str(q?.id);
    const section = str(q?.section);
    const chapter = str(q?.chapter);
    const chapterNo = typeof q?.chapterNo === 'number' ? q.chapterNo : NaN;
    const question = str(q?.question);
    const answer = str(q?.answer);
    const missing: string[] = [];
    if (!qid) missing.push('id');
    if (!section) missing.push('section');
    if (!chapter) missing.push('chapter');
    if (Number.isNaN(chapterNo)) missing.push('chapterNo');
    if (!question) missing.push('question');
    if (!answer) missing.push('answer');
    if (missing.length > 0) {
      return { ok: false, error: `questions[${i}] の必須フィールドが不足: ${missing.join(', ')}` };
    }
    if (seen.has(qid!)) return { ok: false, error: `問題IDが重複しています: ${qid}` };
    seen.add(qid!);
    questions.push({
      id: qid!, section: section!, chapter: chapter!, chapterNo,
      difficulty: optStr(q.difficulty) ?? undefined,
      format: optStr(q.format) ?? undefined,
      question: question!,
      choices: optStr(q.choices),
      answer: answer!,
      explanation: optStr(q.explanation),
      point: optStr(q.point),
    });
  }

  return { ok: true, content: { schemaVersion: CONTENT_SCHEMA_VERSION, id, title, builtin, questions } };
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/domain/content.test.ts`
Expected: PASS（全7ケース）

- [ ] **Step 5: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/domain/content.ts src/domain/content.test.ts src/domain/types.ts
git commit -m "feat: コンテンツJSON検証モジュールと新型定義を追加"
```

---

### Task 3: Excel→コンテンツJSON 変換スクリプトと初期搭載JSON生成

**Files:**
- Create: `scripts/build_contents.py`
- Create（生成物）: `src/data/contents/japanese-history.json`, `src/data/contents/world-history.json`

前提: 変換元Excelは `C:/Users/500886/Downloads/大学入試_日本史_時代別問題集_1500問_修正版.xlsx`（解答修正済みの最新版）と `..._世界史_..._2100問.xlsx`。`問題`シートと`解答・解説`シートを問題IDで結合する。

- [ ] **Step 1: 変換スクリプトを作成**

`scripts/build_contents.py`:
```python
"""Excel(問題集) -> コンテンツJSON 変換（開発用ツール）。
本番ビルドは生成済みJSONのみ使用するため、このスクリプトは実行時依存ではない。
使い方: python scripts/build_contents.py
"""
import json, math, os
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'src', 'data', 'contents')
DL = r'C:/Users/500886/Downloads'

JOBS = [
    # 日本史は解答修正済みの「修正版」を最新として使用する
    dict(xlsx=f'{DL}/大学入試_日本史_時代別問題集_1500問_修正版.xlsx', id='japanese-history', title='日本史'),
    dict(xlsx=f'{DL}/大学入試_世界史_時代別問題集_2100問.xlsx', id='world-history', title='世界史'),
]

def clean(v):
    if v is None: return None
    if isinstance(v, float) and math.isnan(v): return None
    s = str(v).strip()
    return s if s else None

def build(job):
    q = pd.read_excel(job['xlsx'], sheet_name='問題', header=0)
    a = pd.read_excel(job['xlsx'], sheet_name='解答・解説', header=0)
    ans = {r['問題ID']: r for _, r in a.iterrows()}
    questions = []
    for _, r in q.iterrows():
        qid = clean(r['問題ID'])
        if not qid: continue
        ar = ans.get(r['問題ID'], {})
        questions.append({
            'id': qid,
            'section': clean(r['時代区分']),
            'chapter': clean(r['章名']),
            'chapterNo': int(r['章番号']),
            'difficulty': clean(r['難度']),
            'format': clean(r['形式']),
            'question': clean(r['問題文']),
            'choices': clean(r['選択肢']),
            'answer': clean(ar.get('正解')),
            'explanation': clean(ar.get('解説')),
            'point': clean(ar.get('学習ポイント')),
        })
    questions.sort(key=lambda x: (x['chapterNo'], x['id']))
    return {'schemaVersion': 1, 'id': job['id'], 'title': job['title'], 'questions': questions}

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for job in JOBS:
        content = build(job)
        path = os.path.join(OUT_DIR, f"{job['id']}.json")
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        print(f"{job['title']}: {len(content['questions'])}問 -> {path}")

if __name__ == '__main__':
    main()
```

- [ ] **Step 2: 生成を実行**

Run: `cd C:/Users/500886/temp/Learnscape && python scripts/build_contents.py`
Expected: `日本史: 1500問 -> ...japanese-history.json` / `世界史: 2100問 -> ...world-history.json`

- [ ] **Step 3: 生成物を検証（検証モジュールに通す一時テスト）**

一時ファイル `src/data/contents/_generated.test.ts` を作成:
```ts
import { describe, it, expect } from 'vitest';
import { parseContent } from '../../domain/content';
import jp from './japanese-history.json';
import wh from './world-history.json';

describe('生成された初期搭載コンテンツ', () => {
  it('日本史が検証を通過し1500問', () => {
    const r = parseContent(jp);
    expect(r.ok).toBe(true);
    expect(r.content?.questions).toHaveLength(1500);
  });
  it('世界史が検証を通過し2100問', () => {
    const r = parseContent(wh);
    expect(r.ok).toBe(true);
    expect(r.content?.questions).toHaveLength(2100);
  });
});
```

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/data/contents/_generated.test.ts`
Expected: PASS。確認後、この一時テストは削除（Step 4）。

- [ ] **Step 4: 一時テストを削除してコミット**

```bash
cd C:/Users/500886/temp/Learnscape
rm src/data/contents/_generated.test.ts
git add scripts/build_contents.py src/data/contents/japanese-history.json src/data/contents/world-history.json
git commit -m "feat: Excel変換スクリプトと初期搭載JSON(日本史/世界史)を追加"
```

---

### Task 4: 初期搭載コンテンツの束ねモジュール

**Files:**
- Create: `src/data/contents/index.ts`

- [ ] **Step 1: 実装**

`src/data/contents/index.ts`:
```ts
import type { AppData, Content } from '../../domain/types';
import jp from './japanese-history.json';
import wh from './world-history.json';

// JSONは schemaVersion/id/title/questions を持つ。builtin=true を付与して Content 化する。
function asBuiltin(raw: unknown): Content {
  const o = raw as Omit<Content, 'builtin'>;
  return { ...o, builtin: true };
}

export const BUILTIN_CONTENTS: Content[] = [asBuiltin(wh), asBuiltin(jp)];
export const DEFAULT_CONTENT_ID = 'world-history';

export function allContents(data: AppData): Content[] {
  return [...BUILTIN_CONTENTS, ...data.importedContents];
}

export function activeContentOf(data: AppData): Content {
  const all = allContents(data);
  return all.find((c) => c.id === data.activeContentId) ?? all[0];
}
```

> 注: `tsconfig.app.json` は `resolveJsonModule` が Vite 既定で有効。もし import で型エラーが出る場合は `tsconfig.app.json` の `compilerOptions` に `"resolveJsonModule": true` を追加する。

- [ ] **Step 2: 型チェック**

Run: `cd C:/Users/500886/temp/Learnscape && npx tsc -b --noEmit 2>&1 | grep -i "contents/index" || echo "contents/index OK"`
Expected: `contents/index OK`（このファイル自体の型エラーが無い。他ファイルのエラーは後続で解消）

- [ ] **Step 3: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/data/contents/index.ts
git commit -m "feat: 初期搭載コンテンツの束ねとアクティブ解決ヘルパを追加"
```

---

## Phase B: ドメインロジック移行（no→id）

### Task 5: mastery.ts の id 化

**Files:**
- Modify: `src/domain/mastery.ts`
- Test: `src/domain/mastery.test.ts`

- [ ] **Step 1: テストを id ベースへ更新**

`src/domain/mastery.test.ts` を開き、`initialProgress(数値)` の呼び出しを文字列IDへ、`.no` の検証を `.id` へ置換する。先頭のケースを例に:
```ts
// 変更前: const p = initialProgress(1); expect(p.no).toBe(1);
// 変更後:
const p = initialProgress('S0001');
expect(p.id).toBe('S0001');
expect(p.state).toBe('unanswered');
```
`initialProgress(...)` を数値で呼んでいる全箇所を文字列（例 `'S0001'`）に置換し、`p.no` 参照を `p.id` に置換する。

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/domain/mastery.test.ts`
Expected: FAIL（型/プロパティ不一致）

- [ ] **Step 3: 実装を id 化**

`src/domain/mastery.ts` の `initialProgress` を変更:
```ts
export function initialProgress(id: string): QuestionProgress {
  return { id, state: 'unanswered', knownStreak: 0, lastStudiedAt: null };
}
```
`applySwipe` はプロパティ `no` を含まないため変更不要（`{ ...p, ... }` を維持）。

- [ ] **Step 4: 実行して成功を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/domain/mastery.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/domain/mastery.ts src/domain/mastery.test.ts
git commit -m "refactor: mastery を id(string) キーへ移行"
```

---

### Task 6: session.ts の id 化

**Files:**
- Modify: `src/domain/session.ts`
- Test: `src/domain/session.test.ts`

- [ ] **Step 1: テストを id ベースへ更新**

`src/domain/session.test.ts` 内のテスト用問題データを新 `Question` 形（`id/section/chapter/chapterNo/question/answer`）へ書き換える。ヘルパを先頭に追加すると楽:
```ts
import type { Question } from './types';
function q(id: string, chapter: string, chapterNo: number): Question {
  return { id, section: 'sec', chapter, chapterNo, question: `Q${id}`, answer: `A${id}` };
}
```
既存の `{ no: 1, chapter: 'X', ... }` 生成を `q('S0001','X',1)` 等へ置換。`prog` の生成キーを数値から文字列IDへ、`buildChapterSession(...).map(x => x.no)` の検証を `.id` へ置換。`pickByNumbers` を使うケースは Step 3 の新名 `pickByIds` と文字列配列に置換。

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/domain/session.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装を id 化**

`src/domain/session.ts`:
- `stateOf` のシグネチャ: `prog: Record<string, QuestionProgress>, id: string`。本体は `prog[id]?.state ?? 'unanswered'`。
- `orderQuestions` の sequential ソートを `a.id.localeCompare(b.id)` に変更（ゼロ埋めIDのため辞書順＝出題順）:
```ts
if (order === 'sequential') return [...list].sort((a, b) => a.id.localeCompare(b.id));
```
- `buildChapterSession`/`buildUnsureSession` 内の `q.no` を `q.id`、`prog[a.no]` を `prog[a.id]`、`stateOf(prog, q.no)` を `stateOf(prog, q.id)` に置換。`prog` 引数型を `Record<string, QuestionProgress>` に。
- `pickByNumbers` を `pickByIds` にリネームし id ベースへ:
```ts
export function pickByIds(questions: Question[], ids: string[]): Question[] {
  const set = new Set(ids);
  return questions.filter((q) => set.has(q.id)).sort((a, b) => a.id.localeCompare(b.id));
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/domain/session.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/domain/session.ts src/domain/session.test.ts
git commit -m "refactor: session を id(string) キーへ移行し pickByIds に改名"
```

---

### Task 7: browse.ts の id 化

**Files:**
- Modify: `src/domain/browse.ts`
- Test: `src/domain/browse.test.ts`

- [ ] **Step 1: テストを id ベースへ更新**

`src/domain/browse.test.ts` の問題データを新 `Question` 形へ、`prog` キーを文字列IDへ、期待値の `.no` を `.id` へ置換（Task 6 と同じ `q()` ヘルパを流用可）。ソート期待は id 昇順。

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/domain/browse.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装を id 化**

`src/domain/browse.ts`:
```ts
import type { Question, QuestionProgress, MasteryState } from './types';

function stateOf(prog: Record<string, QuestionProgress>, id: string): MasteryState {
  return prog[id]?.state ?? 'unanswered';
}

export function filterQuestions(
  questions: Question[],
  prog: Record<string, QuestionProgress>,
  chapter: string,
  states: MasteryState[],
): Question[] {
  const set = new Set(states);
  return questions
    .filter((q) => q.chapter === chapter && set.has(stateOf(prog, q.id)))
    .sort((a, b) => a.id.localeCompare(b.id));
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/domain/browse.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/domain/browse.ts src/domain/browse.test.ts
git commit -m "refactor: browse を id(string) キーへ移行"
```

---

### Task 8: aggregate.ts の id 化と区分>章構造

**Files:**
- Modify: `src/domain/aggregate.ts`
- Test: `src/domain/aggregate.test.ts`

- [ ] **Step 1: テストを更新し、構造取得の新テストを追加**

`src/domain/aggregate.test.ts` の問題データを新 `Question` 形へ、`prog` キーを文字列IDへ置換。加えて `contentStructure` のテストを追加:
```ts
import { contentStructure, chapterList } from './aggregate';
import type { Question } from './types';

const qs: Question[] = [
  { id: 'A2', section: '区分1', chapter: '章B', chapterNo: 2, question: 'q', answer: 'a' },
  { id: 'A1', section: '区分1', chapter: '章A', chapterNo: 1, question: 'q', answer: 'a' },
  { id: 'A3', section: '区分2', chapter: '章C', chapterNo: 3, question: 'q', answer: 'a' },
];

it('contentStructure は chapterNo 昇順で 区分>章 を返す', () => {
  const s = contentStructure(qs);
  expect(s).toEqual([
    { section: '区分1', chapters: ['章A', '章B'] },
    { section: '区分2', chapters: ['章C'] },
  ]);
});

it('chapterList は章を chapterNo 昇順で平坦化する', () => {
  expect(chapterList(qs)).toEqual(['章A', '章B', '章C']);
});
```

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/domain/aggregate.test.ts`
Expected: FAIL

- [ ] **Step 3: 実装を id 化＋構造関数追加**

`src/domain/aggregate.ts` を以下へ更新:
```ts
import type { Question, QuestionProgress, Counts, MasteryState } from './types';

function stateOf(prog: Record<string, QuestionProgress>, id: string): MasteryState {
  return prog[id]?.state ?? 'unanswered';
}

export function countStates(
  questions: Question[],
  prog: Record<string, QuestionProgress>,
  chapter: string,
): Counts {
  const c: Counts = { mastered: 0, unsure: 0, failed: 0, unanswered: 0 };
  for (const q of questions) {
    if (q.chapter !== chapter) continue;
    c[stateOf(prog, q.id)]++;
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
  prog: Record<string, QuestionProgress>,
): { pct: number; mastered: number; total: number } {
  const total = questions.length;
  const mastered = questions.filter((q) => stateOf(prog, q.id) === 'mastered').length;
  return { pct: total === 0 ? 0 : Math.round((mastered / total) * 100), mastered, total };
}

export interface SectionGroup { section: string; chapters: string[]; }

/** 区分>章 を chapterNo 昇順で構造化（同一区分内は章の初出順＝chapterNo順） */
export function contentStructure(questions: Question[]): SectionGroup[] {
  const sorted = [...questions].sort((a, b) => a.chapterNo - b.chapterNo);
  const groups: SectionGroup[] = [];
  const idx = new Map<string, SectionGroup>();
  const seenChapter = new Set<string>();
  for (const q of sorted) {
    let g = idx.get(q.section);
    if (!g) { g = { section: q.section, chapters: [] }; idx.set(q.section, g); groups.push(g); }
    if (!seenChapter.has(q.chapter)) { seenChapter.add(q.chapter); g.chapters.push(q.chapter); }
  }
  return groups;
}

export function chapterList(questions: Question[]): string[] {
  return contentStructure(questions).flatMap((g) => g.chapters);
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/domain/aggregate.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/domain/aggregate.ts src/domain/aggregate.test.ts
git commit -m "refactor: aggregate を id 化し区分>章の構造関数を追加"
```

---

## Phase C: 状態管理・ストレージ（マルチコンテンツ）

### Task 9: ストレージ スキーマ v2

**Files:**
- Modify: `src/storage/schema.ts`
- Modify: `src/storage/storage.ts`
- Test: `src/storage/storage.test.ts`

- [ ] **Step 1: テストを v2 へ更新**

`src/storage/storage.test.ts` を、`defaultAppData()` が新形（`version:2`, `activeContentId`, `importedContents:[]`, `byContent:{}`）を返すこと、`loadAppData` が空localStorageで既定値を返すこと、`importJson`（バックアップ復元）が壊れた入力で既定にフォールバックすることを検証する内容へ更新。例:
```ts
import { defaultAppData } from './schema';
it('defaultAppData は v2 形', () => {
  const d = defaultAppData();
  expect(d.version).toBe(2);
  expect(d.activeContentId).toBe('world-history');
  expect(d.importedContents).toEqual([]);
  expect(d.byContent).toEqual({});
});
```
（既存の `progress`/`chapterRounds` をトップレベルで検証していたケースは削除する。）

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/storage/storage.test.ts`
Expected: FAIL

- [ ] **Step 3: schema.ts を v2 化**

`src/storage/schema.ts`:
```ts
import type { AppData, Settings } from '../domain/types';
import { emptyStreak } from '../domain/streak';
import { DEFAULT_CONTENT_ID } from '../data/contents';

export const DATA_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: '#20b0b0',
  order: 'random',
  sessionSize: 10,
  masterThreshold: 2,
  soundEnabled: false,
  hapticEnabled: true,
};

export function defaultAppData(): AppData {
  return {
    version: DATA_VERSION,
    activeContentId: DEFAULT_CONTENT_ID,
    importedContents: [],
    byContent: {},
    streak: emptyStreak(),
    settings: { ...DEFAULT_SETTINGS },
  };
}
```

- [ ] **Step 4: storage.ts を v2 化**

`src/storage/storage.ts`:
```ts
import type { AppData } from '../domain/types';
import { defaultAppData, DEFAULT_SETTINGS, DATA_VERSION } from './schema';
import { DEFAULT_CONTENT_ID } from '../data/contents';

const KEY = 'learnscape:data';

function mergeDefaults(raw: Partial<AppData>): AppData {
  const base = defaultAppData();
  return {
    version: DATA_VERSION,
    activeContentId: raw.activeContentId ?? DEFAULT_CONTENT_ID,
    importedContents: Array.isArray(raw.importedContents) ? raw.importedContents : base.importedContents,
    byContent: (raw.byContent && typeof raw.byContent === 'object') ? raw.byContent : base.byContent,
    streak: { ...base.streak, ...(raw.streak ?? {}) },
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
  };
}

export function loadAppData(): AppData {
  const s = localStorage.getItem(KEY);
  if (!s) return defaultAppData();
  try {
    const parsed = JSON.parse(s) as Partial<AppData>;
    // 旧スキーマ(v1)は移行せず破棄（Learnscapeは新規デプロイ）
    if (parsed.version !== DATA_VERSION) return defaultAppData();
    return mergeDefaults(parsed);
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
  const parsed = JSON.parse(json);
  return mergeDefaults(parsed);
}
```

- [ ] **Step 5: 実行して成功を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/storage/storage.test.ts`
Expected: PASS

- [ ] **Step 6: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/storage/schema.ts src/storage/storage.ts src/storage/storage.test.ts
git commit -m "feat: ストレージをスキーマv2(マルチコンテンツ)へ移行"
```

---

### Task 10: AppDataContext のコンテンツ対応

**Files:**
- Modify: `src/state/AppDataContext.tsx`
- Test: `src/state/AppDataContext.test.tsx`

- [ ] **Step 1: テストを更新**

`src/state/AppDataContext.test.tsx` を新APIへ更新。少なくとも「`recordAnswer(id, 'known')` でアクティブコンテンツの `progress[id]` が更新される」「`setActiveContent` でアクティブが切り替わり、別コンテンツの進捗が混ざらない」を検証。既存のレンダリング用ヘルパ（Provider ラップ）を流用し、`data.progress` 参照は context の `progress` に、`recordAnswer(数値,...)` は `recordAnswer('S0001',...)` に置換。

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/state/AppDataContext.test.tsx`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/state/AppDataContext.tsx` を全置換:
```tsx
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type {
  AppData, Settings, SwipeResult, RoundRecord, Content, Question,
  QuestionProgress, RoundRecord as Round,
} from '../domain/types';
import { loadAppData, saveAppData } from '../storage/storage';
import { applySwipe, initialProgress } from '../domain/mastery';
import { recordStudyDay, todayStr } from '../domain/streak';
import { allContents, activeContentOf, DEFAULT_CONTENT_ID } from '../data/contents';

type Action =
  | { type: 'answer'; id: string; result: SwipeResult }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; data: AppData }
  | { type: 'round'; chapter: string; record: RoundRecord }
  | { type: 'setActive'; id: string }
  | { type: 'importContent'; content: Content }
  | { type: 'deleteContent'; id: string };

function emptyCP() { return { progress: {}, chapterRounds: {} }; }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'answer': {
      const cid = state.activeContentId;
      const cp = state.byContent[cid] ?? emptyCP();
      const prev = cp.progress[action.id] ?? initialProgress(action.id);
      const next = applySwipe(prev, action.result, state.settings.masterThreshold, Date.now());
      return {
        ...state,
        byContent: { ...state.byContent, [cid]: { ...cp, progress: { ...cp.progress, [action.id]: next } } },
        streak: recordStudyDay(state.streak, todayStr()),
      };
    }
    case 'round': {
      const cid = state.activeContentId;
      const cp = state.byContent[cid] ?? emptyCP();
      const list = cp.chapterRounds[action.chapter] ?? [];
      return {
        ...state,
        byContent: { ...state.byContent, [cid]: { ...cp, chapterRounds: { ...cp.chapterRounds, [action.chapter]: [...list, action.record] } } },
      };
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'replace':
      return action.data;
    case 'setActive':
      return { ...state, activeContentId: action.id };
    case 'importContent': {
      const c = action.content;
      const others = state.importedContents.filter((x) => x.id !== c.id);
      return { ...state, importedContents: [...others, c], activeContentId: c.id };
    }
    case 'deleteContent': {
      const importedContents = state.importedContents.filter((c) => c.id !== action.id);
      const byContent = { ...state.byContent };
      delete byContent[action.id];
      const activeContentId = state.activeContentId === action.id ? DEFAULT_CONTENT_ID : state.activeContentId;
      return { ...state, importedContents, byContent, activeContentId };
    }
    default:
      return state;
  }
}

interface Ctx {
  data: AppData;
  contents: Content[];
  activeContent: Content;
  questions: Question[];
  progress: Record<string, QuestionProgress>;
  chapterRounds: Record<string, Round[]>;
  recordAnswer: (id: string, result: SwipeResult) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceData: (data: AppData) => void;
  recordRound: (chapter: string, record: RoundRecord) => void;
  setActiveContent: (id: string) => void;
  importContent: (content: Content) => void;
  deleteContent: (id: string) => void;
}

const AppDataCtx = createContext<Ctx | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined as unknown as AppData, loadAppData);

  useEffect(() => { saveAppData(data); }, [data]);

  useEffect(() => {
    const root = document.documentElement;
    const theme = data.settings.theme === 'system'
      ? (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light')
      : data.settings.theme;
    root.setAttribute('data-theme', theme);
    root.style.setProperty('--accent', data.settings.accent);
  }, [data.settings.theme, data.settings.accent]);

  const value = useMemo<Ctx>(() => {
    const activeContent = activeContentOf(data);
    const cp = data.byContent[data.activeContentId] ?? { progress: {}, chapterRounds: {} };
    return {
      data,
      contents: allContents(data),
      activeContent,
      questions: activeContent.questions,
      progress: cp.progress,
      chapterRounds: cp.chapterRounds,
      recordAnswer: (id, result) => dispatch({ type: 'answer', id, result }),
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      replaceData: (d) => dispatch({ type: 'replace', data: d }),
      recordRound: (chapter, record) => dispatch({ type: 'round', chapter, record }),
      setActiveContent: (id) => dispatch({ type: 'setActive', id }),
      importContent: (content) => dispatch({ type: 'importContent', content }),
      deleteContent: (id) => dispatch({ type: 'deleteContent', id }),
    };
  }, [data]);

  return <AppDataCtx.Provider value={value}>{children}</AppDataCtx.Provider>;
}

export function useAppData(): Ctx {
  const c = useContext(AppDataCtx);
  if (!c) throw new Error('useAppData must be used within AppDataProvider');
  return c;
}
```
> 注: `import` の `RoundRecord as Round` はエイリアス。`RoundRecord` を2度importしないよう、実際には `RoundRecord` を1回importして `Round[]` の箇所も `RoundRecord[]` に統一してよい。lint/tsc が通る形に整えること。

- [ ] **Step 4: 実行して成功を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/state/AppDataContext.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/state/AppDataContext.tsx src/state/AppDataContext.test.tsx
git commit -m "feat: AppDataContext をマルチコンテンツ対応(進捗分離/切替/インポート)"
```

---

## Phase D: UI

### Task 11: useQuestions をアクティブコンテンツ連動に

**Files:**
- Modify: `src/hooks/useQuestions.ts`

- [ ] **Step 1: 実装**

`src/hooks/useQuestions.ts`:
```ts
import type { Question } from '../domain/types';
import { useAppData } from '../state/AppDataContext';

export function useQuestions(): Question[] {
  return useAppData().questions;
}
```

- [ ] **Step 2: 型チェック（このファイル）**

Run: `cd C:/Users/500886/temp/Learnscape && npx tsc -b --noEmit 2>&1 | grep -i "useQuestions" || echo "useQuestions OK"`
Expected: `useQuestions OK`

- [ ] **Step 3: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/hooks/useQuestions.ts
git commit -m "refactor: useQuestions をアクティブコンテンツ連動に変更"
```

---

### Task 12: Flashcard の2段階鮮明化＋選択肢/解説/ポイント

**Files:**
- Modify: `src/components/Flashcard.tsx`
- Test: `src/components/Flashcard.test.tsx`

- [ ] **Step 1: テストを更新**

`src/components/Flashcard.test.tsx` の問題データを新 `Question` 形へ。追加検証: `choices`/`explanation`/`point` を持つ問題を渡すと、それらのテキストがDOMに描画される（`getByText`）。既存のスワイプ/キーボード判定のテストは維持（`onJudge` が呼ばれること）。

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/components/Flashcard.test.tsx`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/components/Flashcard.tsx` を全置換:
```tsx
import { useEffect, useRef, useState } from 'react';
import type { Question, SwipeResult } from '../domain/types';

interface Props {
  question: Question;
  onJudge: (result: SwipeResult) => void;
}

// 鮮明化の段階境界。0..STAGE で正解、STAGE..1 で解説・ポイントを鮮明化する。
const STAGE = 0.55;

export function Flashcard({ question, onJudge }: Props) {
  const [reveal, setReveal] = useState(0); // 0..1
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const start = useRef<{ x: number; y: number } | null>(null);
  const THRESHOLD = 90;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onJudge('known');
      else if (e.key === 'ArrowUp') onJudge('unsure');
      else if (e.key === 'ArrowLeft') onJudge('failed');
      // ↓1回目で正解、2回目で解説・ポイントまで
      else if (e.key === 'ArrowDown') setReveal((r) => (r < STAGE ? STAGE : 1));
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
    if (dy > 0) setReveal(Math.min(dy / 220, 1)); // 220pxで全鮮明化（2段階ぶんの余裕）
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

  // 段階1: 正解 / 段階2: 解説・ポイント
  const answerReveal = Math.min(reveal / STAGE, 1);
  const detailReveal = Math.max(0, Math.min((reveal - (1 - STAGE)) / STAGE, 1));
  const trans = start.current ? 'none' : 'filter .2s, opacity .2s';

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
        minHeight: 340, display: 'flex', flexDirection: 'column',
      }}
    >
      <div>
        <div style={{ fontSize: 10, letterSpacing: '.08em', color: 'var(--muted)' }}>問題</div>
        <div style={{ fontSize: 17, lineHeight: 1.6, marginTop: 8, whiteSpace: 'pre-wrap' }}>{question.question}</div>
        {question.choices && (
          <div style={{ fontSize: 14, lineHeight: 1.7, marginTop: 12, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {question.choices}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px dashed var(--border)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.08em', color: 'var(--muted)' }}>解答</div>
        <div style={{
          fontSize: 24, fontWeight: 700, marginTop: 6, color: 'var(--accent)',
          filter: `blur(${9 - 9 * answerReveal}px)`, opacity: 0.25 + 0.75 * answerReveal,
          transition: trans,
        }}>{question.answer}</div>

        {(question.explanation || question.point) && (
          <div style={{
            marginTop: 10,
            filter: `blur(${7 - 7 * detailReveal}px)`, opacity: 0.15 + 0.85 * detailReveal,
            transition: trans,
          }}>
            {question.explanation && (
              <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)' }}>{question.explanation}</div>
            )}
            {question.point && (
              <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--muted)', marginTop: 6 }}>
                💡 {question.point}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 実行して成功を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/components/Flashcard.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/components/Flashcard.tsx src/components/Flashcard.test.tsx
git commit -m "feat: カードを2段階鮮明化(正解→解説/ポイント)し選択肢を併記"
```

---

### Task 13: ContentPicker モーダル

**Files:**
- Create: `src/components/ContentPicker.tsx`

- [ ] **Step 1: 実装**

`src/components/ContentPicker.tsx`:
```tsx
import type { Content } from '../domain/types';

interface Props {
  contents: Content[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ContentPicker({ contents, activeId, onSelect, onDelete, onClose }: Props) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: 'var(--surface)',
          borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '18px 16px 28px',
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>コンテンツを選ぶ</div>
          <span onClick={onClose} style={{ fontSize: 20, color: 'var(--muted)', cursor: 'pointer' }}>✕</span>
        </div>

        {contents.map((c) => {
          const active = c.id === activeId;
          return (
            <div key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px',
                borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
              }}
              onClick={() => { onSelect(c.id); onClose(); }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {c.questions.length}問{c.builtin ? '' : '・読み込み'}
                </div>
              </div>
              {active && <span style={{ color: 'var(--accent)', fontWeight: 800 }}>✓</span>}
              {!c.builtin && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`「${c.title}」を削除します。よろしいですか？（進捗も削除されます）`)) onDelete(c.id);
                  }}
                  style={{ fontSize: 12, color: '#d23b3b', padding: '4px 8px', cursor: 'pointer' }}
                >
                  削除
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `cd C:/Users/500886/temp/Learnscape && npx tsc -b --noEmit 2>&1 | grep -i "ContentPicker" || echo "ContentPicker OK"`
Expected: `ContentPicker OK`

- [ ] **Step 3: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/components/ContentPicker.tsx
git commit -m "feat: コンテンツ選択モーダル(ContentPicker)を追加"
```

---

### Task 14: HomeScreen（実績マップ・区分grouping・タイトルタップ）

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: 実装**

`src/screens/HomeScreen.tsx` を全置換:
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { contentStructure, countStates, masteryPct, overallMastery } from '../domain/aggregate';
import { masteryColor } from '../domain/colors';
import { MasteryRing } from '../components/MasteryRing';
import { ContentPicker } from '../components/ContentPicker';

export function HomeScreen() {
  const nav = useNavigate();
  const { data, questions, progress, activeContent, contents, setActiveContent, deleteContent } = useAppData();
  const [pickerOpen, setPickerOpen] = useState(false);

  const structure = contentStructure(questions);
  const chapters = structure.flatMap((g) => g.chapters);
  const overall = overallMastery(questions, progress);
  const completed = chapters.filter((c) => masteryPct(countStates(questions, progress, c)) >= 100).length;
  const unsureCount = Object.values(progress).filter((p) => p.state === 'unsure').length;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h1
          onClick={() => setPickerOpen(true)}
          style={{ fontSize: 18, margin: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {activeContent.title} 実績マップ
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>▾</span>
        </h1>
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

      {structure.map((group) => (
        <div key={group.section} style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', margin: '0 2px 8px' }}>{group.section}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
            {group.chapters.map((c) => {
              const pct = masteryPct(countStates(questions, progress, c));
              const bg = masteryColor(pct);
              const textColor = pct >= 100 ? '#5a3d00' : pct === 0 ? '#5a6376' : '#fff';
              return (
                <div key={c} onClick={() => nav(`/chapter/${encodeURIComponent(c)}`)}
                  style={{ background: bg, borderRadius: 11, padding: '8px 4px', textAlign: 'center', color: textColor,
                    cursor: 'pointer', minHeight: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 8.5, lineHeight: 1.15, opacity: 0.95, wordBreak: 'break-word' }}>{c}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3, lineHeight: 1 }}>
                    {pct >= 100 ? '🏆' : <>{pct}<span style={{ fontSize: 11, opacity: 0.75 }}>%</span></>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {pickerOpen && (
        <ContentPicker
          contents={contents}
          activeId={activeContent.id}
          onSelect={setActiveContent}
          onDelete={deleteContent}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `cd C:/Users/500886/temp/Learnscape && npx tsc -b --noEmit 2>&1 | grep -i "HomeScreen" || echo "HomeScreen OK"`
Expected: `HomeScreen OK`

- [ ] **Step 3: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/screens/HomeScreen.tsx
git commit -m "feat: ホームを実績マップ(区分grouping)+コンテンツ切替モーダルに"
```

---

### Task 15: SettingsScreen にコンテンツ読み込み

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Test: `src/screens/SettingsScreen.test.tsx`

- [ ] **Step 1: テストを更新/追加**

`src/screens/SettingsScreen.test.tsx`: 既存のバックアップimport/export/resetのテストが `replaceData` 等に依存していれば新context APIに追随。追加として「不正なコンテンツJSONを読み込むとエラー表示され `importContent` が呼ばれない」ことを検証（ファイル入力の `change` を発火し `parseContent` 失敗パスを通す）。テスト実装が重い場合は、少なくとも「コンテンツセクションの見出し『コンテンツ』が描画される」ことを検証。

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/screens/SettingsScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: 実装（コンテキストAPI追随＋コンテンツ節追加）**

`src/screens/SettingsScreen.tsx` の変更点:

(a) import に追加:
```ts
import { parseContent } from '../domain/content';
```
(b) コンポーネント冒頭の分割代入を更新:
```ts
const { data, updateSettings, replaceData, contents, importContent, deleteContent } = useAppData();
```
(c) コンテンツ用の file ref とハンドラを追加（既存 `fileRef`/`doImport` はバックアップ復元用として残す）:
```ts
const contentFileRef = useRef<HTMLInputElement>(null);

function doImportContent(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0];
  e.target.value = ''; // 同一ファイル再選択を許可
  if (!f) return;
  f.text().then((t) => {
    let raw: unknown;
    try { raw = JSON.parse(t); }
    catch { alert('JSONの読み込みに失敗しました（形式が不正です）'); return; }
    const r = parseContent(raw);
    if (!r.ok || !r.content) { alert(`コンテンツの読み込みに失敗しました：\n${r.error}`); return; }
    if (r.content.builtin) { alert('初期搭載と競合するため読み込めません'); return; }
    importContent(r.content);
    alert(`「${r.content.title}」を読み込みました（${r.content.questions.length}問）`);
  });
}
```
(d) 「データ」Section の直前に「コンテンツ」Section を追加:
```tsx
<Section title="コンテンツ">
  <div onClick={() => contentFileRef.current?.click()} style={rowBtn}>コンテンツを読み込む（JSON）</div>
  {contents.map((c, i) => (
    <div key={c.id} style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8,
      borderBottom: i < contents.length - 1 ? '1px solid var(--border)' : 'none' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13 }}>{c.title}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.questions.length}問{c.builtin ? '・初期搭載' : ''}</div>
      </div>
      {!c.builtin && (
        <span onClick={() => { if (window.confirm(`「${c.title}」を削除しますか？（進捗も削除されます）`)) deleteContent(c.id); }}
          style={{ fontSize: 12, color: '#d23b3b', cursor: 'pointer' }}>削除</span>
      )}
    </div>
  ))}
  <input ref={contentFileRef} type="file" accept="application/json,.json" hidden onChange={doImportContent} />
</Section>
```
(e) フッターの版名を更新（既存の `世界史 一問一答 ・ v1.2.0` を置換。バージョンは Task 17 で `1.3.0` に統一）:
```tsx
<div style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', margin: '16px 0' }}>Learnscape ・ v1.3.0</div>
```

- [ ] **Step 4: 実行して成功を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/screens/SettingsScreen.test.tsx`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/screens/SettingsScreen.tsx src/screens/SettingsScreen.test.tsx
git commit -m "feat: 設定にコンテンツ読み込み(ファイル選択)と一覧/削除を追加"
```

---

### Task 16: 残り画面の id 化・コンテキスト連動

**Files:**
- Modify: `src/screens/StudyScreen.tsx`
- Modify: `src/screens/ResultScreen.tsx`
- Modify: `src/screens/StatsScreen.tsx`
- Modify: `src/screens/ChapterDetailScreen.tsx`
- Modify: `src/screens/QuestionListScreen.tsx`
- Test: `src/screens/StudyScreen.test.tsx`, `src/screens/QuestionListScreen.test.tsx`

各画面で共通の置換方針:
- `const { data } = useAppData()` → 必要な値を context から取得（`questions`, `progress`, `chapterRounds` を使用）。`useQuestions()` 呼び出しは残してもよい（context連動済み）が、`data.progress`→`progress`、`data.chapterRounds`→`chapterRounds` に置換する。`data.streak`/`data.settings` は従来どおり `data.` 経由で可。
- `q.no` → `q.id`、`prog[...no]` → `prog[...id]`、`key={q.no}` → `key={q.id}`。
- `pickByNumbers` → `pickByIds`、`failedNos:number[]` → `failedIds:string[]`。

- [ ] **Step 1: StudyScreen.test / QuestionListScreen.test を更新**

両テストの問題データを新 `Question` 形へ、進捗キーを文字列IDへ置換。StudyScreen テストで `failedNos` を使う箇所は `failedIds`（string[]）へ。

- [ ] **Step 2: 実行して失敗を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/screens/StudyScreen.test.tsx src/screens/QuestionListScreen.test.tsx`
Expected: FAIL

- [ ] **Step 3: StudyScreen を更新**

`src/screens/StudyScreen.tsx` の具体変更:
- 分割代入: `const { data, questions, progress, chapterRounds, recordAnswer, recordRound } = useAppData();`（`useQuestions()` 呼び出しは削除し context の `questions` を使用）
- `initial` 内の `data.progress` → `progress`、`data.streak` は維持。`pickByNumbers` → `pickByIds`、`loc.state.failedNos` → `failedIds`（型 `{ failedIds?: string[] }`）。`session.map((s) => s.no)` → `.id`、`data.progress[no]?.state` → `progress[id]?.state`。`failedNos` 変数を `failedIds` に改名し navigate state のキーも `failedIds`。
- `useEffect` 完了処理の `data.chapterRounds[chapter]` → `chapterRounds[chapter]`、`countStates(questions, data.progress, chapter)` → `countStates(questions, progress, chapter)`。
- `judge` 内: `data.progress[q.no]` → `progress[q.id]`、`initialProgress(q.no)` → `initialProgress(q.id)`、`recordAnswer(q.no, result)` → `recordAnswer(q.id, result)`。
- `<Flashcard key={q.no} .../>` → `key={q.id}`。

- [ ] **Step 4: ResultScreen を更新**

`src/screens/ResultScreen.tsx`:
- `ResultState.failedNos: number[]` → `failedIds: string[]`。
- 分割代入に `progress`, `chapterRounds` を追加し、`data.progress`→`progress`、`data.chapterRounds[...]`→`chapterRounds[...]` に置換。`data.streak` は維持。
- 「できなかった◯問だけ復習」ボタン: `st.failedNos` → `st.failedIds`、navigate state `{ failedNos: ... }` → `{ failedIds: ... }`、ラベルの件数も `st.failedIds.length`。

- [ ] **Step 5: StatsScreen を更新**

`src/screens/StatsScreen.tsx`:
- 分割代入に `progress` を追加、`useQuestions()` は context 連動のため維持可。`chapterList(questions)` はそのまま（新実装で chapterNo 順）。`countStates(questions, data.progress, c)` → `countStates(questions, progress, c)`、`overallMastery(questions, data.progress)` → `progress`。`data.streak` 維持。

- [ ] **Step 6: ChapterDetailScreen を更新**

`src/screens/ChapterDetailScreen.tsx`:
- 分割代入に `progress`, `chapterRounds` を追加。`countStates(questions, data.progress, chapter)` → `progress`、`data.chapterRounds[chapter]` → `chapterRounds[chapter]`。他は変更不要。

- [ ] **Step 7: QuestionListScreen を更新**

`src/screens/QuestionListScreen.tsx`:
- 分割代入に `progress` を追加。`filterQuestions(questions, data.progress, chapter, states)` → `progress`。
- `revealed`/`tapRow`/`key` の型を `number` から `string` へ: `useState<Set<string>>`, `tapRow(id: string)`, `data.progress[q.no]` → `progress[q.id]`, `revealed.has(q.no)` → `revealed.has(q.id)`, `key={q.no}` → `key={q.id}`, `onClick={() => tapRow(q.id)}`。

- [ ] **Step 8: 実行して成功を確認**

Run: `cd C:/Users/500886/temp/Learnscape && npx vitest run src/screens/StudyScreen.test.tsx src/screens/QuestionListScreen.test.tsx`
Expected: PASS

- [ ] **Step 9: 全体型チェック（緑化確認）**

Run: `cd C:/Users/500886/temp/Learnscape && npx tsc -b --noEmit`
Expected: エラーなし（Phase A〜D の移行完了で全解消）

- [ ] **Step 10: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add src/screens/StudyScreen.tsx src/screens/ResultScreen.tsx src/screens/StatsScreen.tsx src/screens/ChapterDetailScreen.tsx src/screens/QuestionListScreen.tsx src/screens/StudyScreen.test.tsx src/screens/QuestionListScreen.test.tsx
git commit -m "refactor: 残り画面を id 化しコンテンツ別進捗に連動"
```

---

## Phase E: 仕上げ・検証

### Task 17: 名称・バージョン・PWAメタ更新

**Files:**
- Modify: `vite.config.ts`
- Modify: `index.html`
- Modify: `package.json`

- [ ] **Step 1: vite.config.ts の manifest 名称**

`vite.config.ts` の `manifest` を更新: `name: 'Learnscape'`, `short_name: 'Learnscape'`。`base: '/Learnscape/'` は維持。

- [ ] **Step 2: index.html のタイトル**

`index.html` の `<title>世界史 一問一答</title>` → `<title>Learnscape</title>`。

- [ ] **Step 3: package.json バージョン**

`package.json` の `version` を `1.3.0` に更新（メモリ運用ルール: デプロイ機能追加によりマイナーUP）。`scripts` の `"questions": "node scripts/build-questions.mjs"` は Task 18 の整理対象。ここでは触れない。

- [ ] **Step 4: SettingsScreen フッターの版名（Task 15 で固定した場合の整合）**

Task 15 で `Learnscape ・ v1.3.0` としたい場合はここで文字列を合わせる（固定文字列で可）。

- [ ] **Step 5: コミット**

```bash
cd C:/Users/500886/temp/Learnscape
git add vite.config.ts index.html package.json src/screens/SettingsScreen.tsx
git commit -m "chore: アプリ名称をLearnscapeに統一しv1.3.0へ"
```

---

### Task 18: フルビルド・テスト検証と旧ファイル整理

**Files:**
- 検証のみ、および旧ファイル整理（要ユーザー確認）

- [ ] **Step 1: 全テスト実行**

Run: `cd C:/Users/500886/temp/Learnscape && npm test`
Expected: 全テスト PASS（`smoke.test.ts` 含む）。失敗があれば該当タスクに戻って修正。

- [ ] **Step 2: 本番ビルド**

Run: `cd C:/Users/500886/temp/Learnscape && npm run build`
Expected: `tsc -b` 成功 → `vite build` 成功。`dist/` が生成される。エラーなし。

- [ ] **Step 3: ローカルプレビューで実機確認（手動）**

Run: `cd C:/Users/500886/temp/Learnscape && npm run preview`
ブラウザで `http://localhost:4173/Learnscape/` を開き、以下を確認:
- ホームが「世界史 実績マップ」で表示され、区分見出しごとに章タイルが並ぶ
- タイトルタップ→モーダルで日本史へ切替→「日本史 実績マップ」に変わり、進捗が独立
- 章タップ→学習→↓で正解、さらに↓で解説・ポイントが順に鮮明化
- 設定→「コンテンツを読み込む」で、エクスポートした形式ではなくコンテンツJSON（`src/data/contents/world-history.json` 等）を選ぶと取り込める／不正ファイルはエラー表示

- [ ] **Step 4: 旧ファイル整理（要ユーザー確認）**

以下は現在未使用。ユーザーのファイル削除ルール（`C:\Users\500886\削除\Learnscape\` へ移動）に従い、**ユーザーに確認してから**実施する:
- `data/questions.csv`
- `src/data/questions.json`
- `scripts/build-questions.mjs`
- `package.json` の `"questions"` スクリプト（`build-contents.py` に役割移行済み）

移動コマンド例（確認後）:
```bash
mkdir -p "C:/Users/500886/削除/Learnscape"
mv "C:/Users/500886/temp/Learnscape/data/questions.csv" "C:/Users/500886/削除/Learnscape/"
mv "C:/Users/500886/temp/Learnscape/src/data/questions.json" "C:/Users/500886/削除/Learnscape/"
mv "C:/Users/500886/temp/Learnscape/scripts/build-questions.mjs" "C:/Users/500886/削除/Learnscape/"
```
その後 `package.json` の `"questions"` 行を削除し、`git add -A && git commit -m "chore: 旧世界史CSV系ファイルを整理"`。

- [ ] **Step 5: プッシュとデプロイ確認**

```bash
cd C:/Users/500886/temp/Learnscape
git push
```
GitHub Actions の Pages デプロイ完了後、`https://wikeda.github.io/Learnscape/` で本番動作を確認。

---

## 自己レビュー結果（記入済み）

- **スペック網羅**: R1(インポート=Task2,3,15) / R2(構造維持=各画面は最小変更) / R3(設定にファイル選択=Task15) / R4(JSON形式=Task2の型・検証) / R5,R6(タイトル反映=Task14) / R7(区分>章=Task8) / R8(章タイル+grouping=Task14) / R9(タイトルタップ切替モーダル=Task13,14) — 全要件にタスク対応あり。
- **プレースホルダ**: なし（各コード手順は完全なコードを提示）。
- **型整合**: `Question.id:string` / `QuestionProgress.id` / `pickByIds` / `failedIds:string[]` / `ContentProgress`/`AppData v2` を全タスクで一貫使用。`countStates`/`filterQuestions`/`buildChapterSession` 等の `prog` は `Record<string, QuestionProgress>` に統一。
