import { describe, it, expect } from 'vitest';
import { filterQuestions } from './browse';
import type { Question, QuestionProgress } from './types';

function q(id: string, chapter: string, chapterNo: number): Question {
  return { id, section: 'sec', chapter, chapterNo, question: `Q${id}`, answer: `A${id}` };
}

// わざと id をバラバラに並べて、昇順に整列されることを確認する
const qs: Question[] = [
  q('S03', 'A', 1),
  q('S01', 'A', 1),
  q('S02', 'A', 1),
  q('S04', 'B', 1),
];

const prog: Record<string, QuestionProgress> = {
  S01: { id: 'S01', state: 'mastered', knownStreak: 2, lastStudiedAt: 1 },
  S02: { id: 'S02', state: 'unsure', knownStreak: 0, lastStudiedAt: 1 },
  // S03 は未登録 → unanswered 扱い
};

describe('filterQuestions', () => {
  it('指定した状態の問題だけを id昇順で返す', () => {
    const r = filterQuestions(qs, prog, 'A', ['mastered', 'unanswered']);
    expect(r.map((x) => x.id)).toEqual(['S01', 'S03']);
  });

  it('全状態を指定すると章の全問が id昇順で返る', () => {
    const r = filterQuestions(qs, prog, 'A', ['mastered', 'unsure', 'failed', 'unanswered']);
    expect(r.map((x) => x.id)).toEqual(['S01', 'S02', 'S03']);
  });

  it('他の章の問題は含まない', () => {
    const r = filterQuestions(qs, prog, 'B', ['mastered', 'unsure', 'failed', 'unanswered']);
    expect(r.map((x) => x.id)).toEqual(['S04']);
  });

  it('状態の指定が空なら空配列', () => {
    expect(filterQuestions(qs, prog, 'A', [])).toEqual([]);
  });
});
