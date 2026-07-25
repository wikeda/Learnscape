import type { Question, QuestionProgress, MasteryState } from './types';

function stateOf(prog: Record<number, QuestionProgress>, no: number): MasteryState {
  return prog[no]?.state ?? 'unanswered';
}

/** 章の問題を、指定した習熟度の集合で絞り込む（No.昇順） */
export function filterQuestions(
  questions: Question[],
  prog: Record<number, QuestionProgress>,
  chapter: string,
  states: MasteryState[],
): Question[] {
  const set = new Set(states);
  return questions
    .filter((q) => q.chapter === chapter && set.has(stateOf(prog, q.no)))
    .sort((a, b) => a.no - b.no);
}
