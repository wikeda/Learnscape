import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppDataProvider } from '../state/AppDataContext';
import { useHaptic, isHapticSupported } from './useHaptic';
import { HAPTIC_PATTERNS } from '../domain/haptics';

const vibrate = vi.fn();

function setVibrate(fn: unknown) {
  Object.defineProperty(navigator, 'vibrate', { value: fn, configurable: true, writable: true });
}

function seedSettings(settings: Record<string, unknown>) {
  localStorage.setItem('learnscape:data', JSON.stringify({
    version: 2,
    activeContentId: 'world-history',
    importedContents: [],
    byContent: {},
    settings,
  }));
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <AppDataProvider>{children}</AppDataProvider>;
}

beforeEach(() => {
  localStorage.clear();
  vibrate.mockClear();
  setVibrate(vibrate);
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'vibrate');
});

describe('isHapticSupported', () => {
  it('navigator.vibrate があれば true', () => {
    expect(isHapticSupported()).toBe(true);
  });

  it('navigator.vibrate が無ければ false', () => {
    Reflect.deleteProperty(navigator, 'vibrate');
    expect(isHapticSupported()).toBe(false);
  });
});

describe('useHaptic', () => {
  it('既定（ON）ではイベントのパターンで振動する', () => {
    const { result } = renderHook(() => useHaptic(), { wrapper });
    act(() => result.current('known'));
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.known);
  });

  it('設定がOFFなら振動しない', () => {
    seedSettings({ hapticEnabled: false });
    const { result } = renderHook(() => useHaptic(), { wrapper });
    act(() => result.current('known'));
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('非対応の端末でも例外を投げない', () => {
    Reflect.deleteProperty(navigator, 'vibrate');
    const { result } = renderHook(() => useHaptic(), { wrapper });
    expect(() => act(() => result.current('known'))).not.toThrow();
  });

  it('vibrate が例外を投げても呼び出し側には伝播しない', () => {
    setVibrate(() => { throw new Error('blocked'); });
    const { result } = renderHook(() => useHaptic(), { wrapper });
    expect(() => act(() => result.current('known'))).not.toThrow();
  });
});
