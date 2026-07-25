import type { QuestionProgress, SwipeResult, MasterThreshold } from './types';

export function initialProgress(no: number): QuestionProgress {
  return { no, state: 'unanswered', knownStreak: 0, lastStudiedAt: null };
}

export function applySwipe(
  p: QuestionProgress,
  result: SwipeResult,
  threshold: MasterThreshold,
  now: number,
): QuestionProgress {
  if (result === 'known') {
    const knownStreak = p.knownStreak + 1;
    const state = knownStreak >= threshold ? 'mastered' : 'unsure';
    return { ...p, state, knownStreak, lastStudiedAt: now };
  }
  if (result === 'unsure') {
    return { ...p, state: 'unsure', knownStreak: 0, lastStudiedAt: now };
  }
  // failed
  return { ...p, state: 'failed', knownStreak: 0, lastStudiedAt: now };
}
