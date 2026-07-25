import type { Question, QuestionProgress, MasteryState } from './types';

function stateOf(prog: Record<string, QuestionProgress>, id: string): MasteryState {
  return prog[id]?.state ?? 'unanswered';
}

/** 章の問題を、指定した習熟度の集合で絞り込む（id昇順） */
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
