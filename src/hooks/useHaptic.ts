import { useCallback } from 'react';
import { useAppData } from '../state/AppDataContext';
import { hapticPattern } from '../domain/haptics';
import type { HapticEvent } from '../domain/haptics';

/** 端末が振動APIに対応しているか（iOS Safari は非対応） */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function useHaptic(): (event: HapticEvent) => void {
  const { data } = useAppData();
  const enabled = data.settings.hapticEnabled;

  return useCallback((event: HapticEvent) => {
    const pattern = hapticPattern(event, enabled);
    if (!pattern || !isHapticSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // 端末やブラウザの都合で失敗しても学習は止めない
    }
  }, [enabled]);
}
