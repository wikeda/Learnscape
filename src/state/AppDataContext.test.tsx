import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppDataProvider, useAppData } from './AppDataContext';

beforeEach(() => localStorage.clear());

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppDataProvider>{children}</AppDataProvider>
);

describe('AppDataContext', () => {
  it('recordAnswer でアクティブコンテンツの progress[id] が更新される', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    const activeId = result.current.data.activeContentId;
    act(() => { result.current.recordAnswer('S0001', 'known'); });
    expect(result.current.progress.S0001.knownStreak).toBe(1);
    expect(result.current.data.byContent[activeId].progress.S0001.knownStreak).toBe(1);
    expect(result.current.data.streak.current).toBe(1);
  });

  it('setActiveContent で別コンテンツの進捗が混ざらない', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    const contentA = result.current.data.activeContentId;
    const contentB = result.current.contents.find((c) => c.id !== contentA)!.id;

    act(() => { result.current.recordAnswer('S0001', 'known'); });
    expect(result.current.progress.S0001).toBeDefined();

    act(() => { result.current.setActiveContent(contentB); });
    expect(result.current.data.activeContentId).toBe(contentB);
    expect(result.current.progress.S0001).toBeUndefined();

    act(() => { result.current.setActiveContent(contentA); });
    expect(result.current.progress.S0001.knownStreak).toBe(1);
  });

  it('updateSettings が反映され永続化される', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    act(() => { result.current.updateSettings({ order: 'random' }); });
    expect(result.current.data.settings.order).toBe('random');
    expect(JSON.parse(localStorage.getItem('learnscape:data')!).settings.order).toBe('random');
  });
});
