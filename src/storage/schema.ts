import type { AppData, Settings } from '../domain/types';
import { emptyStreak } from '../domain/streak';
import { DEFAULT_CONTENT_ID } from '../data/contents';

export const DATA_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  accent: '#20b0b0',     // アクセント選択肢の最右（ティール）
  order: 'random',
  sessionSize: 10,
  masterThreshold: 2,    // 覚えた2回連続でマスター
  soundEnabled: false,
  hapticEnabled: true,
  showSections: true,
};

export function defaultAppData(): AppData {
  return {
    version: DATA_VERSION,
    activeContentId: DEFAULT_CONTENT_ID,
    importedContents: [],
    byContent: {},
    streak: emptyStreak(),
    settings: { ...DEFAULT_SETTINGS },
  };
}
