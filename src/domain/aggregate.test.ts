import { describe, it, expect } from 'vitest';
import { countStates, masteryPct, overallMastery } from './aggregate';
import type { Question, QuestionProgress } from './types';

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
