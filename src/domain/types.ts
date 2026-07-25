export interface Question {
  id: string;            // 例 "JH0001"
  section: string;       // 区分（時代区分）
  chapter: string;       // 章（章名）
  chapterNo: number;     // 章の並び順
  difficulty?: string;   // 難度
  format?: string;       // 形式
  question: string;      // 問題文
  choices?: string | null;      // 選択肢（選択式のみ）
  answer: string;        // 正解
  explanation?: string | null;  // 解説
  point?: string | null;        // 学習ポイント
}

export type MasteryState = 'unanswered' | 'failed' | 'unsure' | 'mastered';
export type SwipeResult = 'known' | 'unsure' | 'failed';

export interface QuestionProgress {
  id: string;            // 旧 no:number
  state: MasteryState;
  knownStreak: number;
  lastStudiedAt: number | null;
}

export interface Counts { mastered: number; unsure: number; failed: number; unanswered: number; }
export interface RoundRecord { round: number; timestamp: number; counts: Counts; masteryPct: number; }
export interface Streak { current: number; longest: number; lastStudyDate: string | null; studyDates: string[]; }

export type Theme = 'light' | 'dark' | 'system';
export type Order = 'sequential' | 'random';
export type SessionSize = 0 | 10 | 20 | 30;
export type MasterThreshold = 1 | 2;

export interface Settings {
  theme: Theme; accent: string; order: Order; sessionSize: SessionSize;
  masterThreshold: MasterThreshold; soundEnabled: boolean; hapticEnabled: boolean;
  showSections: boolean;   // 区分(section)見出しをホーム/成績で表示するか
}

export interface Content {
  schemaVersion: number;
  id: string;
  title: string;
  builtin: boolean;      // 初期搭載=true（削除不可）
  questions: Question[];
}

export interface ContentProgress {
  progress: Record<string, QuestionProgress>;    // key: question.id
  chapterRounds: Record<string, RoundRecord[]>;   // key: chapter名
}

export interface AppData {
  version: number;                                // = 2
  activeContentId: string;
  importedContents: Content[];                    // インポート分のみ（初期搭載は同梱JSON）
  byContent: Record<string, ContentProgress>;     // key: content.id
  streak: Streak;                                 // 全コンテンツ横断
  settings: Settings;
}
