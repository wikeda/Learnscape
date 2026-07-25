import type { MasteryState } from './types';

export function masteryColor(pct: number): string {
  if (pct >= 100) return '#e3b23c'; // 金
  if (pct >= 76) return '#3f9e5a';  // 緑
  if (pct >= 51) return '#9cc93f';  // 黄緑
  if (pct >= 26) return '#f0993c';  // 橙
  if (pct >= 1) return '#e5736b';   // 赤
  return '#c9ccd6';                 // 灰
}

export const STATE_COLORS: Record<MasteryState, string> = {
  mastered: '#3f9e5a',
  unsure: '#e6b800',
  failed: '#e5736b',
  unanswered: '#c9ccd6',
};
