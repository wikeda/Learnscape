import type { Question, QuestionProgress, Counts, MasteryState } from './types';

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
