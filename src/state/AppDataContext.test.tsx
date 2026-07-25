import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppDataProvider, useAppData } from './AppDataContext';
import { DEFAULT_CONTENT_ID } from '../data/contents';
import type { Content } from '../domain/types';

beforeEach(() => localStorage.clear());

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppDataProvider>{children}</AppDataProvider>
);

function makeContent(id: string, title = id): Content {
  return {
    schemaVersion: 1,
    id,
    title,
    builtin: false,
    questions: [
      { id: 'X0001', section: '区分', chapter: '章1', chapterNo: 1, question: 'Q', answer: 'A' },
    ],
  };
}

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

  it('コンテンツBに切替えて記録してもコンテンツAに漏れない（逆方向）', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    const contentA = result.current.data.activeContentId; // world-history
    const contentB = result.current.contents.find((c) => c.id !== contentA)!.id; // japanese-history

    act(() => { result.current.setActiveContent(contentB); });
    act(() => { result.current.recordAnswer('S0001', 'known'); });
    expect(result.current.progress.S0001.knownStreak).toBe(1);

    act(() => { result.current.setActiveContent(contentA); });
    // Bで記録したS0001はAには存在しないため未回答のまま
    expect(result.current.progress.S0001).toBeUndefined();
  });

  it('importContent で新コンテンツが追加されアクティブに切り替わる。同idの再importは置換される', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    const content = makeContent('sample-content', 'サンプル');

    act(() => { result.current.importContent(content); });
    expect(result.current.contents.some((c) => c.id === 'sample-content')).toBe(true);
    expect(result.current.activeContent.id).toBe('sample-content');
    expect(result.current.data.importedContents).toHaveLength(1);

    const replaced = makeContent('sample-content', 'サンプル改訂版');
    act(() => { result.current.importContent(replaced); });
    const matches = result.current.contents.filter((c) => c.id === 'sample-content');
    expect(matches).toHaveLength(1);
    expect(matches[0].title).toBe('サンプル改訂版');
    expect(result.current.data.importedContents).toHaveLength(1);
  });

  it('deleteContent でコンテンツが消え、アクティブは既定コンテンツへフォールバックする', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    const content = makeContent('sample-content-2');

    act(() => { result.current.importContent(content); });
    expect(result.current.activeContent.id).toBe('sample-content-2');

    act(() => { result.current.deleteContent('sample-content-2'); });
    expect(result.current.contents.some((c) => c.id === 'sample-content-2')).toBe(false);
    expect(result.current.data.activeContentId).toBe(DEFAULT_CONTENT_ID);
  });

  it('updateSettings が反映され永続化される', () => {
    const { result } = renderHook(() => useAppData(), { wrapper });
    act(() => { result.current.updateSettings({ order: 'random' }); });
    expect(result.current.data.settings.order).toBe('random');
    expect(JSON.parse(localStorage.getItem('learnscape:data')!).settings.order).toBe('random');
  });
});
