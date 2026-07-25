import type { Streak } from './types';

export function emptyStreak(): Streak {
  return { current: 0, longest: 0, lastStudyDate: null, studyDates: [] };
}

/** 'YYYY-MM-DD' の前日を返す（ローカル日付ベース、タイムゾーンによるズレを避ける） */
function prevDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function recordStudyDay(streak: Streak, today: string): Streak {
  if (streak.lastStudyDate === today) return streak; // 同日は変化なし
  let current: number;
  if (streak.lastStudyDate === prevDay(today)) current = streak.current + 1;
  else current = 1;
  const longest = Math.max(streak.longest, current);
  const studyDates = streak.studyDates.includes(today)
    ? streak.studyDates
    : [...streak.studyDates, today];
  return { current, longest, lastStudyDate: today, studyDates };
}

/** ローカル日付を 'YYYY-MM-DD' で返す */
export function todayStr(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
