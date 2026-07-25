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
