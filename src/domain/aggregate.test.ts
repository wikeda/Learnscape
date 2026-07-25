import { describe, it, expect } from 'vitest';
import { countStates, masteryPct, overallMastery, contentStructure, chapterList } from './aggregate';
import type { Question, QuestionProgress } from './types';

function q(id: string, section: string, chapter: string, chapterNo: number): Question {
  return { id, section, chapter, chapterNo, question: `Q${id}`, answer: `A${id}` };
}

const qs: Question[] = [
  q('S01', 'sec', 'A', 1),
  q('S02', 'sec', 'A', 1),
  q('S03', 'sec', 'A', 1),
  q('S04', 'sec', 'B', 2),
];
const prog: Record<string, QuestionProgress> = {
  S01: { id: 'S01', state: 'mastered', knownStreak: 2, lastStudiedAt: 1 },
  S02: { id: 'S02', state: 'unsure', knownStreak: 0, lastStudiedAt: 1 },
  // S03 は未登録 → unanswered 扱い
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

describe('contentStructure / chapterList', () => {
  const structQs: Question[] = [
    { id: 'A2', section: '区分1', chapter: '章B', chapterNo: 2, question: 'q', answer: 'a' },
    { id: 'A1', section: '区分1', chapter: '章A', chapterNo: 1, question: 'q', answer: 'a' },
    { id: 'A3', section: '区分2', chapter: '章C', chapterNo: 3, question: 'q', answer: 'a' },
  ];

  it('contentStructure は chapterNo 昇順で 区分>章 を返す', () => {
    const s = contentStructure(structQs);
    expect(s).toEqual([
      { section: '区分1', chapters: ['章A', '章B'] },
      { section: '区分2', chapters: ['章C'] },
    ]);
  });

  it('chapterList は章を chapterNo 昇順で平坦化する', () => {
    expect(chapterList(structQs)).toEqual(['章A', '章B', '章C']);
  });
});
