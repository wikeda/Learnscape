import { describe, it, expect, beforeEach } from 'vitest';
import { loadAppData, saveAppData, exportJson, importJson } from './storage';
import { defaultAppData } from './schema';

beforeEach(() => localStorage.clear());

describe('storage', () => {
  it('空なら既定を返す', () => {
    const d = loadAppData();
    expect(d.version).toBe(1);
    expect(d.settings.sessionSize).toBe(10);
    expect(d.settings.theme).toBe('dark');
    expect(d.settings.accent).toBe('#20b0b0');
    expect(d.settings.order).toBe('random');
    expect(d.settings.masterThreshold).toBe(2);
  });

  it('保存→読み込みで往復', () => {
    const d = defaultAppData();
    d.progress[1] = { no: 1, state: 'mastered', knownStreak: 2, lastStudiedAt: 5 };
    saveAppData(d);
    expect(loadAppData().progress[1].state).toBe('mastered');
  });

  it('欠けたキーは既定でマージ', () => {
    localStorage.setItem('whq:data', JSON.stringify({ version: 1, progress: {} }));
    const d = loadAppData();
    expect(d.settings).toBeDefined();
    expect(d.streak.current).toBe(0);
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
