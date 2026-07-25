export interface Question {
  no: number;
  chapter: string;
  question: string;
  answer: string;
}

/** 習熟度4状態 */
export type MasteryState = 'unanswered' | 'failed' | 'unsure' | 'mastered';

/** スワイプ判定: 右=known / 上=unsure / 左=failed（下=絞りは判定ではない） */
export type SwipeResult = 'known' | 'unsure' | 'failed';

export interface QuestionProgress {
  no: number;
  state: MasteryState;
  /** 「覚えた」の連続回数 */
  knownStreak: number;
  lastStudiedAt: number | null;
}

export interface Counts {
  mastered: number;
  unsure: number;
  failed: number;
  unanswered: number;
}

/** 章を1周した記録（積層棒グラフ用） */
export interface RoundRecord {
  round: number;
  timestamp: number;
  counts: Counts;
  masteryPct: number;
}

export interface Streak {
  current: number;
  longest: number;
  lastStudyDate: string | null; // 'YYYY-MM-DD'
  studyDates: string[];
}

export type Theme = 'light' | 'dark' | 'system';
export type Order = 'sequential' | 'random';
/** 0 = 制限なし */
export type SessionSize = 0 | 10 | 20 | 30;
export type MasterThreshold = 1 | 2;

export interface Settings {
  theme: Theme;
  accent: string;       // CSS color
  order: Order;
  sessionSize: SessionSize;
  masterThreshold: MasterThreshold;
  soundEnabled: boolean;
  hapticEnabled: boolean;
}

export interface AppData {
  version: number;
  progress: Record<number, QuestionProgress>;   // key: question.no
  chapterRounds: Record<string, RoundRecord[]>; // key: chapter名
  streak: Streak;
  settings: Settings;
}
