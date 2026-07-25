import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Content, Question } from '../domain/types';

// テスト用の固定コンテンツ（実データの章構成・問題文に依存しないよう差し替える）。
const { TEST_CONTENT } = vi.hoisted(() => {
  function q(n: number, question: string, answer: string): Question {
    const id = `T${String(n).padStart(4, '0')}`;
    return { id, section: '区分', chapter: '古代オリエント', chapterNo: 1, question, answer };
  }
  const questions: Question[] = [
    q(1, 'ラテン語で日の昇るところを意味する語は？', 'オリエント'),
    q(2, 'ティグリス・ユーフラテス川流域に成立した文明は？', 'メソポタミア'),
  ];
  const TEST_CONTENT = { schemaVersion: 1, id: 'world-history', title: '世界史', builtin: true, questions };
  return { TEST_CONTENT };
});

vi.mock('../data/contents', () => ({
  BUILTIN_CONTENTS: [TEST_CONTENT],
  DEFAULT_CONTENT_ID: 'world-history',
  allContents: (data: { importedContents: Content[] }) => [TEST_CONTENT as Content, ...data.importedContents],
  activeContentOf: (data: { activeContentId: string; importedContents: Content[] }) => {
    const all = [TEST_CONTENT as Content, ...data.importedContents];
    return all.find((c) => c.id === data.activeContentId) ?? all[0];
  },
}));

import { AppDataProvider } from '../state/AppDataContext';
import { QuestionListScreen } from './QuestionListScreen';

beforeEach(() => localStorage.clear());

function renderList() {
  return render(
    <AppDataProvider>
      <MemoryRouter initialEntries={['/chapter/古代オリエント/questions']}>
        <Routes>
          <Route path="/chapter/:chapter/questions" element={<QuestionListScreen />} />
        </Routes>
      </MemoryRouter>
    </AppDataProvider>,
  );
}

describe('QuestionListScreen', () => {
  it('初期表示では解答が隠れている', () => {
    renderList();
    expect(screen.queryByText('オリエント')).toBeNull();
  });

  it('一括トグルで解答が表示され、もう一度押すと隠れる', () => {
    renderList();
    fireEvent.click(screen.getByText('🔓 解答を表示'));
    expect(screen.getByText('オリエント')).toBeInTheDocument();

    fireEvent.click(screen.getByText('🔒 解答を隠す'));
    expect(screen.queryByText('オリエント')).toBeNull();
  });

  it('隠している時に行をタップすると、その問題だけ解答が出る', () => {
    renderList();
    expect(screen.queryByText('オリエント')).toBeNull();

    // T0001 の問題文をタップ（行のクリックが伝播する）
    fireEvent.click(screen.getByText(/ラテン語で日の昇るところ/));
    expect(screen.getByText('オリエント')).toBeInTheDocument();
    // 他の問題（T0002 メソポタミア）は隠れたまま
    expect(screen.queryByText('メソポタミア')).toBeNull();
  });

  it('絞り込みで「未回答」を外すと該当なしになる', () => {
    renderList();
    fireEvent.click(screen.getByText('絞り込み ▾'));
    fireEvent.click(screen.getByText('未回答'));
    expect(screen.getByText('該当する問題がありません')).toBeInTheDocument();
  });
});
