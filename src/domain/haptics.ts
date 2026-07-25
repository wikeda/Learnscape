import type { QuestionProgress, SwipeResult, MasterThreshold } from './types';
import { applySwipe } from './mastery';

export type HapticEvent = 'known' | 'unsure' | 'failed' | 'mastered' | 'complete';

/**
 * navigator.vibrate に渡すミリ秒配列（奇数番目=振動 / 偶数番目=休止）。
 * 1セッション10問が既定なので、連続しても煩わしくない長さに収めている。
 */
export const HAPTIC_PATTERNS: Record<HapticEvent, number[]> = {
  known: [12],                        // 短い一発。歯切れよく軽い
  unsure: [8, 40, 8],                 // 軽い2連。「迷い」を表す
  failed: [28],                       // やや長い一発。重さを残す
  mastered: [12],                     // known と同じ。回答のテンポを乱さないため（設計書 2章参照）
  complete: [18, 60, 18, 60, 40],     // 完了の合図
};

/** 無効なら null。呼び出し側の分岐を1つに絞るため */
export function hapticPattern(event: HapticEvent, enabled: boolean): number[] | null {
  return enabled ? HAPTIC_PATTERNS[event] : null;
}

/**
 * 判定の結果どのイベントを鳴らすかを決める。
 * 遷移ルールは applySwipe に一本化する（ここでしきい値を数え直さない）。
 */
export function hapticEventForSwipe(
  before: QuestionProgress,
  result: SwipeResult,
  threshold: MasterThreshold,
): HapticEvent {
  const after = applySwipe(before, result, threshold, 0); // 時刻は状態判定に影響しない
  if (after.state === 'mastered' && before.state !== 'mastered') return 'mastered';
  return result;
}
