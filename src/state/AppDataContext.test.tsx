import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppDataProvider, useAppData } from './AppDataContext';

beforeEach(() => localStorage.clear());

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppDataProvider>{children}</AppDataProvider>
);

describe('AppDataContext', () => {
  it('recordAnswer で progress と streak が更新される', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    act(() => { result.current.recordAnswer(1, 'known'); });
    expect(result.current.data.progress[1].knownStreak).toBe(1);
    expect(result.current.data.streak.current).toBe(1);
  });

  it('updateSettings が反映され永続化される', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    act(() => { result.current.updateSettings({ order: 'random' }); });
    expect(result.current.data.settings.order).toBe('random');
    expect(JSON.parse(localStorage.getItem('whq:data')!).settings.order).toBe('random');
  });
});
