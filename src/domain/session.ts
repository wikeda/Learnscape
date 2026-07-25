import type { Question, QuestionProgress, Order, MasteryState } from './types';

function stateOf(prog: Record<string, QuestionProgress>, id: string): MasteryState {
  return prog[id]?.state ?? 'unanswered';
}

function orderQuestions(list: Question[], order: Order, rng: () => number): Question[] {
  if (order === 'sequential') return [...list].sort((a, b) => a.id.localeCompare(b.id));
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
  prog: Record<string, QuestionProgress>,
  chapter: string,
  opts: ChapterSessionOpts,
): Question[] {
  const rng = opts.rng ?? Math.random;
  const inChapter = questions.filter((q) => q.chapter === chapter);
  const unmastered = inChapter.filter((q) => stateOf(prog, q.id) !== 'mastered');
  const mastered = inChapter.filter((q) => stateOf(prog, q.id) === 'mastered');

  // 全問マスター済み（100%）なら「もう一度ぜんぶ復習」として全問を対象にする
  let base: Question[];
  if (unmastered.length === 0) {
    base = inChapter;
  } else {
    // マスターは最終学習が古い順に少量混ぜる（定着確認）
    const maintainCount = Math.floor(unmastered.length * opts.maintenanceRatio);
    const maintain = [...mastered]
      .sort((a, b) => (prog[a.id]?.lastStudiedAt ?? 0) - (prog[b.id]?.lastStudiedAt ?? 0))
      .slice(0, maintainCount);
    base = [...unmastered, ...maintain];
  }

  let pool = orderQuestions(base, opts.order, rng);
  if (opts.sessionSize > 0) pool = pool.slice(0, opts.sessionSize);
  return pool;
}

export interface UnsureSessionOpts { order: Order; sessionSize: number; rng?: () => number; }

export function buildUnsureSession(
  questions: Question[],
  prog: Record<string, QuestionProgress>,
  chapter: string,
  opts: UnsureSessionOpts,
): Question[] {
  const rng = opts.rng ?? Math.random;
  const unsure = questions.filter((q) =>
    (chapter === 'all' || q.chapter === chapter) && stateOf(prog, q.id) === 'unsure');
  let pool = orderQuestions(unsure, opts.order, rng);
  if (opts.sessionSize > 0) pool = pool.slice(0, opts.sessionSize);
  return pool;
}

/** リザルトの「できなかった◯問だけ」用: 指定idのみ抽出 */
export function pickByIds(questions: Question[], ids: string[]): Question[] {
  const set = new Set(ids);
  return questions.filter((q) => set.has(q.id)).sort((a, b) => a.id.localeCompare(b.id));
}
