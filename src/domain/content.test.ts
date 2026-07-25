import { describe, it, expect } from 'vitest';
import { parseContent, CONTENT_SCHEMA_VERSION } from './content';

const validRaw = {
  schemaVersion: 1,
  id: 'sample',
  title: 'サンプル',
  questions: [
    { id: 'S0001', section: '区分A', chapter: '章1', chapterNo: 1, question: 'Q', answer: 'A' },
    { id: 'S0002', section: '区分A', chapter: '章1', chapterNo: 1, question: 'Q2', answer: 'A2',
      choices: 'ア／イ', difficulty: '基礎', format: '正誤', explanation: '解説', point: 'ポイント' },
  ],
};

describe('parseContent', () => {
  it('正当なJSONを Content(builtin=false) に変換する', () => {
    const r = parseContent(validRaw);
    expect(r.ok).toBe(true);
    expect(r.content?.id).toBe('sample');
    expect(r.content?.builtin).toBe(false);
    expect(r.content?.questions).toHaveLength(2);
    // 任意フィールド未指定は null に正規化
    expect(r.content?.questions[0].choices).toBeNull();
    expect(r.content?.questions[0].explanation).toBeNull();
  });

  it('schemaVersion が未知ならエラー', () => {
    const r = parseContent({ ...validRaw, schemaVersion: 999 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/schemaVersion/);
  });

  it('title が空ならエラー', () => {
    const r = parseContent({ ...validRaw, title: '' });
    expect(r.ok).toBe(false);
  });

  it('questions が空配列ならエラー', () => {
    const r = parseContent({ ...validRaw, questions: [] });
    expect(r.ok).toBe(false);
  });

  it('必須フィールド欠落（answer なし）はエラー', () => {
    const bad = { ...validRaw, questions: [{ id: 'X', section: 's', chapter: 'c', chapterNo: 1, question: 'q' }] };
    const r = parseContent(bad);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/answer/);
  });

  it('問題IDの重複はエラー', () => {
    const dup = { ...validRaw, questions: [validRaw.questions[0], validRaw.questions[0]] };
    const r = parseContent(dup);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/重複|duplicate/i);
  });

  it('CONTENT_SCHEMA_VERSION は 1', () => {
    expect(CONTENT_SCHEMA_VERSION).toBe(1);
  });
});
