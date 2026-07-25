import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppData, saveAppData, exportJson, importJson } from './storage';
import { defaultAppData } from './schema';

beforeEach(() => localStorage.clear());

describe('storage', () => {
  it('空なら既定を返す', () => {
    const d = loadAppData();
    expect(d.version).toBe(2);
    expect(d.activeContentId).toBe('world-history');
    expect(d.importedContents).toEqual([]);
    expect(d.byContent).toEqual({});
    expect(d.settings.sessionSize).toBe(10);
    expect(d.settings.theme).toBe('dark');
    expect(d.settings.accent).toBe('#20b0b0');
    expect(d.settings.order).toBe('random');
    expect(d.settings.masterThreshold).toBe(2);
  });

  it('defaultAppData は v2 形', () => {
    const d = defaultAppData();
    expect(d.version).toBe(2);
    expect(d.activeContentId).toBe('world-history');
    expect(d.importedContents).toEqual([]);
    expect(d.byContent).toEqual({});
  });

  it('保存→読み込みで往復', () => {
    const d = defaultAppData();
    d.byContent['world-history'] = {
      progress: { S0001: { id: 'S0001', state: 'mastered', knownStreak: 2, lastStudiedAt: 5 } },
      chapterRounds: {},
    };
    saveAppData(d);
    expect(loadAppData().byContent['world-history'].progress.S0001.state).toBe('mastered');
  });

  it('欠けたキーは既定でマージ', () => {
    localStorage.setItem('learnscape:data', JSON.stringify({ version: 2, byContent: {} }));
    const d = loadAppData();
    expect(d.settings).toBeDefined();
    expect(d.streak.current).toBe(0);
  });

  it('旧v1スキーマは破棄して既定を返す', () => {
    localStorage.setItem('learnscape:data', JSON.stringify({ version: 1, progress: {}, chapterRounds: {} }));
    const d = loadAppData();
    expect(d.version).toBe(2);
    expect(d.activeContentId).toBe('world-history');
    expect(d.importedContents).toEqual([]);
    expect(d.byContent).toEqual({});
  });

  it('export→import で復元', () => {
    const d = defaultAppData();
    d.streak.current = 7;
    const json = exportJson(d);
    const restored = importJson(json);
    expect(restored.streak.current).toBe(7);
  });

  it('壊れたJSONのimportは例外', () => {
    expect(() => importJson('{not json')).toThrow();
  });
});
