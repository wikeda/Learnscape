import { describe, it, expect } from 'vitest';
import { filterQuestions } from './browse';
import type { Question, QuestionProgress } from './types';

// わざと No. をバラバラに並べて、昇順に整列されることを確認する
const qs: Question[] = [
  { no: 3, chapter: 'A', question: 'q3', answer: 'a3' },
  { no: 1, chapter: 'A', question: 'q1', answer: 'a1' },
  { no: 2, chapter: 'A', question: 'q2', answer: 'a2' },
  { no: 4, chapter: 'B', question: 'q4', answer: 'a4' },
];

const prog: Record<number, QuestionProgress> = {
  1: { no: 1, state: 'mastered', knownStreak: 2, lastStudiedAt: 1 },
  2: { no: 2, state: 'unsure', knownStreak: 0, lastStudiedAt: 1 },
  // 3 は未登録 → unanswered 扱い
};

describe('filterQuestions', () => {
  it('指定した状態の問題だけを No.昇順で返す', () => {
    const r = filterQuestions(qs, prog, 'A', ['mastered', 'unanswered']);
    expect(r.map((q) => q.no)).toEqual([1, 3]);
  });

  it('全状態を指定すると章の全問が No.昇順で返る', () => {
    const r = filterQuestions(qs, prog, 'A', ['mastered', 'unsure', 'failed', 'unanswered']);
    expect(r.map((q) => q.no)).toEqual([1, 2, 3]);
  });

  it('他の章の問題は含まない', () => {
    const r = filterQuestions(qs, prog, 'B', ['mastered', 'unsure', 'failed', 'unanswered']);
    expect(r.map((q) => q.no)).toEqual([4]);
  });

  it('状態の指定が空なら空配列', () => {
    expect(filterQuestions(qs, prog, 'A', [])).toEqual([]);
  });
});
